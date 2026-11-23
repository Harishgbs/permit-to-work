import type { PermitStatus } from '@prisma/client';
import { HttpError } from '../../utils/http-error';

export const ALLOWED_TRANSITIONS: Record<PermitStatus, readonly PermitStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'CLOSED', 'EXPIRED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
  REJECTED: [],
  EXPIRED: [],
  CLOSED: ['CLOSED_VERIFIED', 'CANCELLED'],
  CLOSED_VERIFIED: [],
  CANCELLED: [],
};

export function canTransition(from: PermitStatus, to: PermitStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PermitStatus, to: PermitStatus): void {
  if (!canTransition(from, to)) {
    throw new HttpError(409, `Cannot change permit status from ${from} to ${to}`);
  }
}
