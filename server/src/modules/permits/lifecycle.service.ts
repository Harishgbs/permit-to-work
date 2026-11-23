import type { PermitStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/http-error';
import { writeAudit } from './audit';
import {
  assertAreaAccess,
  findPermitOrThrow,
  findPermitWithRelationsOrThrow,
} from './permit.service';
import type { PermitActor } from './permit.types';
import { assertTransition } from './state-machine';

type Transaction = Prisma.TransactionClient;

async function transitionPermit(
  tx: Transaction,
  permit: { id: string; status: PermitStatus; version: number },
  to: PermitStatus,
  actor: PermitActor,
  action: string,
  comment?: string,
  extra: Prisma.PermitUpdateManyMutationInput = {},
): Promise<void> {
  assertTransition(permit.status, to);

  const result = await tx.permit.updateMany({
    where: { id: permit.id, status: permit.status, version: permit.version },
    data: {
      ...extra,
      status: to,
      version: { increment: 1 },
    },
  });

  if (result.count !== 1) {
    throw new HttpError(409, 'Permit was modified concurrently; reload and retry');
  }

  await writeAudit(tx, {
    permitId: permit.id,
    actorId: actor.id,
    action,
    fromValue: permit.status,
    toValue: to,
    comment,
  });
}

function assertApproverEligibility(
  permit: { requesterId: string; areaId: string },
  actor: PermitActor,
): void {
  if (!['AREA_OWNER', 'SAFETY_OFFICER', 'ADMIN'].includes(actor.role)) {
    throw new HttpError(403, 'Insufficient role to decide on approvals');
  }

  if (actor.id === permit.requesterId) {
    throw new HttpError(403, 'A requester cannot approve or reject their own permit');
  }
}

async function decideApproval(
  id: string,
  actor: PermitActor,
  decision: 'APPROVED' | 'REJECTED',
  comment?: string,
): Promise<unknown> {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);

    if (permit.status !== 'PENDING_APPROVAL') {
      throw new HttpError(409, 'Permit is not awaiting approval');
    }

    assertApproverEligibility(permit, actor);
    await assertAreaAccess(permit, actor);

    const approval = await tx.approval.findFirst({
      where: {
        permitId: id,
        status: 'PENDING',
        ...(actor.role === 'ADMIN' ? {} : { requiredRole: actor.role }),
      },
      orderBy: { step: 'asc' },
    });

    if (!approval) {
      throw new HttpError(403, 'No pending approval is assigned to your role');
    }

    const decisionResult = await tx.approval.updateMany({
      where: { id: approval.id, status: 'PENDING' },
      data: {
        status: decision,
        approverId: actor.id,
        decidedAt: new Date(),
        comment: comment ?? null,
      },
    });

    if (decisionResult.count !== 1) {
      throw new HttpError(409, 'Approval was already decided; reload and retry');
    }

    await writeAudit(tx, {
      permitId: id,
      actorId: actor.id,
      action: decision === 'APPROVED' ? 'APPROVAL_APPROVED' : 'APPROVAL_REJECTED',
      toValue: decision,
      comment: comment ?? `Step ${approval.step} ${approval.requiredRole} approval`,
    });

    if (decision === 'REJECTED') {
      await transitionPermit(
        tx,
        permit,
        'REJECTED',
        actor,
        'PERMIT_REJECTED',
        comment ?? 'Permit rejected by approver',
      );
    } else {
      const pending = await tx.approval.count({ where: { permitId: id, status: 'PENDING' } });

      if (pending === 0) {
        await transitionPermit(
          tx,
          permit,
          'APPROVED',
          actor,
          'PERMIT_APPROVED',
          'All required approvals received',
        );
      }
    }

    return findPermitWithRelationsOrThrow(id, tx);
  });
}

export async function approvePermit(id: string, actor: PermitActor, comment?: string) {
  return decideApproval(id, actor, 'APPROVED', comment);
}

export async function rejectPermit(id: string, actor: PermitActor, reason: string) {
  return decideApproval(id, actor, 'REJECTED', reason);
}

export async function activatePermit(
  id: string,
  actor: PermitActor,
  input: { validUntil?: Date; comment?: string },
) {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);
    const now = new Date();

    if (permit.status === 'EXPIRED') {
      throw new HttpError(409, 'Permit has expired; create a new permit');
    }

    assertTransition(permit.status, 'ACTIVE');

    if (permit.status !== 'APPROVED') {
      throw new HttpError(409, 'Only an approved permit can be activated');
    }

    const approvedCount = await tx.approval.count({
      where: { permitId: id, status: 'APPROVED' },
    });
    const pendingOrRejected = await tx.approval.findFirst({
      where: { permitId: id, status: { not: 'APPROVED' } },
    });

    if (approvedCount < 2 || pendingOrRejected) {
      throw new HttpError(409, 'All required approvals must be granted before activation');
    }

    if (now < permit.plannedStartAt) {
      throw new HttpError(409, 'Permit cannot be activated before its planned start time');
    }

    const validUntil = input.validUntil ?? permit.plannedEndAt;

    if (!validUntil || validUntil <= now) {
      throw new HttpError(409, 'Permit validity has ended; create a new permit');
    }

    if (validUntil > permit.plannedEndAt) {
      throw new HttpError(400, 'Validity end cannot be later than the planned end time');
    }

    await transitionPermit(
      tx,
      permit,
      'ACTIVE',
      actor,
      'PERMIT_ACTIVATED',
      input.comment ?? 'Permit activated',
      { validUntil },
    );

    return findPermitWithRelationsOrThrow(id, tx);
  });
}

export async function suspendPermit(id: string, actor: PermitActor, reason: string) {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);

    if (permit.status !== 'ACTIVE') {
      throw new HttpError(409, 'Only an active permit can be suspended');
    }

    await transitionPermit(tx, permit, 'SUSPENDED', actor, 'PERMIT_SUSPENDED', reason);

    return findPermitWithRelationsOrThrow(id, tx);
  });
}

export async function resumePermit(id: string, actor: PermitActor, comment?: string) {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);

    if (permit.status === 'EXPIRED') {
      throw new HttpError(409, 'Permit has expired; create a new permit');
    }

    if (permit.status !== 'SUSPENDED') {
      throw new HttpError(409, 'Only a suspended permit can be resumed');
    }

    if (!permit.validUntil || permit.validUntil <= new Date()) {
      throw new HttpError(409, 'Permit validity has ended; create a new permit');
    }

    await transitionPermit(tx, permit, 'ACTIVE', actor, 'PERMIT_RESUMED', comment);

    return findPermitWithRelationsOrThrow(id, tx);
  });
}

export async function closePermit(id: string, actor: PermitActor, comment?: string) {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);

    if (actor.role === 'REQUESTER' && permit.requesterId !== actor.id) {
      throw new HttpError(403, 'Only the requester may close this permit');
    }

    await assertAreaAccess(permit, actor);

    if (permit.status !== 'ACTIVE') {
      throw new HttpError(409, 'Only an active permit can be closed');
    }

    await transitionPermit(tx, permit, 'CLOSED', actor, 'PERMIT_CLOSED', comment);

    return findPermitWithRelationsOrThrow(id, tx);
  });
}

export async function verifyPermit(id: string, actor: PermitActor, comment?: string) {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);

    if (permit.status !== 'CLOSED') {
      throw new HttpError(409, 'Only a closed permit can be verified');
    }

    await transitionPermit(
      tx,
      permit,
      'CLOSED_VERIFIED',
      actor,
      'PERMIT_VERIFIED',
      comment ?? 'Closure verified by safety officer',
    );

    return findPermitWithRelationsOrThrow(id, tx);
  });
}

export async function cancelPermit(id: string, actor: PermitActor, reason: string) {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);

    if (actor.role === 'REQUESTER' && permit.requesterId !== actor.id) {
      throw new HttpError(403, 'Only the requester may cancel this permit');
    }

    await transitionPermit(tx, permit, 'CANCELLED', actor, 'PERMIT_CANCELLED', reason);

    return findPermitWithRelationsOrThrow(id, tx);
  });
}

export async function expireDuePermits(now: Date = new Date()): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const due = await tx.permit.findMany({
      where: {
        status: { in: ['ACTIVE', 'SUSPENDED'] },
        validUntil: { lte: now },
      },
      select: { id: true, status: true, version: true, permitNumber: true },
    });

    let expired = 0;

    for (const permit of due) {
      const result = await tx.permit.updateMany({
        where: { id: permit.id, status: permit.status, version: permit.version },
        data: { status: 'EXPIRED', version: { increment: 1 } },
      });

      if (result.count === 1) {
        await writeAudit(tx, {
          permitId: permit.id,
          action: 'PERMIT_EXPIRED',
          fromValue: permit.status,
          toValue: 'EXPIRED',
          comment: `Automatic expiry for ${permit.permitNumber}`,
          systemAction: true,
        });
        expired += 1;
      }
    }

    return expired;
  });
}
