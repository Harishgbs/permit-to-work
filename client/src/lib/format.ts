import type { PermitAuditEntry, PermitStatus, PermitType, Role } from '../types/api';

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export function toDateTimeInputValue(value: string | null | undefined): string {
  if (!value) return '';

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function formatStatus(status: PermitStatus): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatType(type: PermitType): string {
  const labels: Record<PermitType, string> = {
    HOT_WORK: 'Hot Work',
    CONFINED_SPACE: 'Confined Space',
    WORKING_AT_HEIGHT: 'Working at Height',
    ELECTRICAL_LOTO: 'Electrical LOTO',
  };

  return labels[type];
}

export function formatRole(role: Role): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const auditActionLabels: Record<string, string> = {
  PERMIT_CREATED: 'Permit created',
  PERMIT_UPDATED: 'Permit details updated',
  PERMIT_SUBMITTED: 'Submitted for approval',
  APPROVAL_APPROVED: 'Approval step approved',
  APPROVAL_REJECTED: 'Approval step rejected',
  PERMIT_APPROVED: 'Permit approved',
  PERMIT_REJECTED: 'Permit rejected',
  PERMIT_ACTIVATED: 'Permit activated',
  PERMIT_SUSPENDED: 'Permit suspended',
  PERMIT_RESUMED: 'Permit resumed',
  PERMIT_CLOSED: 'Work closed',
  PERMIT_VERIFIED: 'Closeout verified',
  PERMIT_CANCELLED: 'Permit cancelled',
  PERMIT_EXPIRED: 'Permit expired',
  WORK_LOG_ADDED: 'Work log added',
};

function humanizeToken(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatAuditAction(action: string): string {
  return auditActionLabels[action] ?? humanizeToken(action);
}

export function formatAuditValue(value: string | null | undefined): string {
  return value ? humanizeToken(value) : '—';
}

export function formatAuditActor(
  entry: Pick<PermitAuditEntry, 'actor' | 'systemAction'>,
): string {
  if (entry.systemAction) return 'System';
  if (!entry.actor) return 'Unknown user';

  return entry.actor.name || entry.actor.email;
}
