import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { canAccessArea } from '../authorization/area-access';
import { HttpError } from '../../utils/http-error';
import { isApproverActor, myPendingApprovalPermitWhere } from './approval-access';
import { writeAudit } from './audit';
import { assertTransition } from './state-machine';
import type { CreatePermitInput, ListPermitsInput } from './permit.validation';
import {
  permitInclude,
  type PermitActor,
  type PermitAuditEntry,
  type PermitWithRelations,
} from './permit.types';

type Transaction = Prisma.TransactionClient;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function findPermitOrThrow(id: string, tx: Transaction = prisma) {
  const permit = await tx.permit.findUnique({ where: { id } });

  if (!permit) {
    throw new HttpError(404, 'Permit not found');
  }

  return permit;
}

export async function findPermitWithRelationsOrThrow(
  id: string,
  tx: Transaction = prisma,
): Promise<PermitWithRelations> {
  const permit = await tx.permit.findUnique({ where: { id }, include: permitInclude });

  if (!permit) {
    throw new HttpError(404, 'Permit not found');
  }

  return permit;
}

function assertRequesterOwnership(permit: { requesterId: string }, actor: PermitActor): void {
  if (actor.role === 'REQUESTER' && permit.requesterId !== actor.id) {
    throw new HttpError(403, 'Only the requester may modify this permit');
  }
}

export async function assertAreaAccess(
  permit: { areaId: string },
  actor: PermitActor,
): Promise<void> {
  if (!(await canAccessArea(actor, permit.areaId))) {
    throw new HttpError(403, 'Access denied for this area');
  }
}

async function assertRelations(tx: Transaction, input: CreatePermitInput): Promise<void> {
  const plant = await tx.plant.findUnique({ where: { id: input.plantId } });

  if (!plant) {
    throw new HttpError(400, 'Plant not found');
  }

  const area = await tx.area.findUnique({ where: { id: input.areaId } });

  if (!area || area.plantId !== plant.id) {
    throw new HttpError(400, 'Area must belong to the selected plant');
  }

  const equipment = await tx.equipment.findUnique({ where: { id: input.equipmentId } });

  if (!equipment || equipment.areaId !== area.id) {
    throw new HttpError(400, 'Equipment must belong to the selected area');
  }
}

async function nextPermitNumber(tx: Transaction): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ next: bigint }>>`SELECT nextval('"PermitNumberSeq"') AS next`;
  const sequence = Number(rows[0]?.next ?? 0n);

  return `PTW-${new Date().getUTCFullYear()}-${sequence.toString().padStart(6, '0')}`;
}

type PermitInputData = Omit<Prisma.PermitUncheckedCreateInput, 'permitNumber' | 'requesterId'>;

function permitDataFromInput(input: CreatePermitInput): PermitInputData {
  const { type, typeData, ...fields } = input;

  return {
    ...fields,
    type,
    typeData: toJsonValue(typeData),
  };
}

export async function createPermit(input: CreatePermitInput, actor: PermitActor) {
  return prisma.$transaction(async (tx) => {
    await assertRelations(tx, input);

    const permit = await tx.permit.create({
      data: {
        ...permitDataFromInput(input),
        permitNumber: await nextPermitNumber(tx),
        requesterId: actor.id,
      },
    });

    await writeAudit(tx, {
      permitId: permit.id,
      actorId: actor.id,
      action: 'PERMIT_CREATED',
      toValue: permit.status,
      comment: `Created ${permit.permitNumber}`,
    });

    return findPermitWithRelationsOrThrow(permit.id, tx);
  });
}

export async function updatePermit(id: string, input: CreatePermitInput, actor: PermitActor) {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);

    assertRequesterOwnership(permit, actor);
    assertTransition(permit.status, 'PENDING_APPROVAL');

    if (permit.status !== 'DRAFT') {
      throw new HttpError(409, 'Only draft permits can be edited');
    }

    await assertRelations(tx, input);

    const result = await tx.permit.updateMany({
      where: { id, status: 'DRAFT', version: permit.version },
      data: {
        ...permitDataFromInput(input),
        version: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      throw new HttpError(409, 'Permit was modified concurrently; reload and retry');
    }

    await writeAudit(tx, {
      permitId: id,
      actorId: actor.id,
      action: 'PERMIT_UPDATED',
      toValue: 'DRAFT',
      comment: 'Draft permit details updated',
    });

    return findPermitWithRelationsOrThrow(id, tx);
  });
}

export async function submitPermit(id: string, actor: PermitActor) {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);

    assertRequesterOwnership(permit, actor);
    assertTransition(permit.status, 'PENDING_APPROVAL');

    const areaOwner = await tx.user.findFirst({
      where: { role: 'AREA_OWNER', areaId: permit.areaId },
      select: { id: true },
    });
    const safetyOfficer = await tx.user.findFirst({
      where: { role: 'SAFETY_OFFICER' },
      select: { id: true },
    });

    if (!areaOwner || !safetyOfficer) {
      throw new HttpError(409, 'Required approvers are not configured for this area');
    }

    await tx.approval.createMany({
      data: [
        { permitId: id, step: 1, requiredRole: 'AREA_OWNER', status: 'PENDING' },
        { permitId: id, step: 2, requiredRole: 'SAFETY_OFFICER', status: 'PENDING' },
      ],
      skipDuplicates: true,
    });

    const result = await tx.permit.updateMany({
      where: { id, status: 'DRAFT', version: permit.version },
      data: { status: 'PENDING_APPROVAL', version: { increment: 1 } },
    });

    if (result.count !== 1) {
      throw new HttpError(409, 'Permit was modified concurrently; reload and retry');
    }

    await writeAudit(tx, {
      permitId: id,
      actorId: actor.id,
      action: 'PERMIT_SUBMITTED',
      fromValue: 'DRAFT',
      toValue: 'PENDING_APPROVAL',
      comment: 'Submitted for area owner and safety officer approval',
    });

    return findPermitWithRelationsOrThrow(id, tx);
  });
}

export async function listPermits(input: ListPermitsInput, actor: PermitActor) {
  const where: Prisma.PermitWhereInput = {};
  const and: Prisma.PermitWhereInput[] = [];

  if (input.status) where.status = input.status;
  if (input.type) where.type = input.type;
  if (input.plantId) where.plantId = input.plantId;
  if (input.areaId) where.areaId = input.areaId;

  if (actor.role === 'AREA_OWNER') {
    where.areaId = actor.areaId ?? '__NO_AREA__';
  }

  if (input.search) {
    where.OR = [
      { permitNumber: { contains: input.search, mode: 'insensitive' } },
      { workDescription: { contains: input.search, mode: 'insensitive' } },
      { contractorTeam: { contains: input.search, mode: 'insensitive' } },
    ];
  }

  if (input.startDate || input.endDate) {
    const plannedStartAt: Prisma.DateTimeFilter = {};

    if (input.startDate) {
      plannedStartAt.gte = new Date(`${input.startDate}T00:00:00.000Z`);
    }

    if (input.endDate) {
      plannedStartAt.lte = new Date(`${input.endDate}T23:59:59.999Z`);
    }

    where.plannedStartAt = plannedStartAt;
  }

  if (input.myApprovalsPending) {
    if (!isApproverActor(actor)) {
      throw new HttpError(403, 'Insufficient role to filter by pending approvals');
    }

    const pendingWhere = myPendingApprovalPermitWhere(actor);
    if (pendingWhere) and.push(pendingWhere);
  }

  if (and.length > 0) where.AND = and;

  const [data, total] = await Promise.all([
    prisma.permit.findMany({
      where,
      include: permitInclude,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.permit.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    },
  };
}

export async function listPermitAudit(id: string): Promise<PermitAuditEntry[]> {
  await findPermitOrThrow(id);

  const entries = await prisma.auditLog.findMany({
    where: { permitId: id },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
  });

  return entries.map(({ timestamp, ...entry }) => ({
    ...entry,
    timestamp: timestamp.toISOString(),
  }));
}

export async function addWorkLog(id: string, note: string, actor: PermitActor) {
  return prisma.$transaction(async (tx) => {
    const permit = await findPermitOrThrow(id, tx);

    assertRequesterOwnership(permit, actor);
    await assertAreaAccess(permit, actor);

    if (permit.status !== 'ACTIVE') {
      throw new HttpError(409, 'Work logs may only be added while a permit is active');
    }

    const log = await tx.workLog.create({
      data: { permitId: id, actorId: actor.id, note },
    });

    await writeAudit(tx, {
      permitId: id,
      actorId: actor.id,
      action: 'WORK_LOG_ADDED',
      toValue: 'ACTIVE',
      comment: note,
    });

    return log;
  });
}
