import type { PermitStatus, PermitType, Role } from '../types/api';

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
