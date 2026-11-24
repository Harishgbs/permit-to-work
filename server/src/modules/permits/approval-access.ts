import type { Prisma } from '@prisma/client';
import { hasPermission } from '../authorization/permissions';
import type { PermitActor } from './permit.types';

export function isApproverActor(actor: PermitActor): boolean {
  return hasPermission(actor.role, 'permit:approve');
}

export function pendingApprovalWhere(actor: PermitActor): Prisma.ApprovalWhereInput {
  return {
    status: 'PENDING',
    ...(actor.role === 'ADMIN' ? {} : { requiredRole: actor.role }),
  };
}

export function myPendingApprovalPermitWhere(actor: PermitActor): Prisma.PermitWhereInput | null {
  if (!isApproverActor(actor)) return null;

  return {
    status: 'PENDING_APPROVAL',
    requesterId: { not: actor.id },
    ...(actor.role === 'AREA_OWNER' ? { areaId: actor.areaId ?? '__NO_AREA__' } : {}),
    approvals: { some: pendingApprovalWhere(actor) },
  };
}
