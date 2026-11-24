import type { Permit } from '../types/api';

export const EXPIRY_WARNING_WINDOW_MS = 2 * 60 * 60 * 1000;

export type ExpirySubject = Pick<Permit, 'status' | 'validUntil'>;

export type ExpiryState = 'expired' | 'expiring-soon' | 'active' | 'unknown' | 'not-applicable';

export function parseExpiryTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getRemainingMs(
  validUntil: string | null | undefined,
  now: number = Date.now(),
): number | null {
  const timestamp = parseExpiryTimestamp(validUntil);

  if (timestamp === null) return null;

  return Math.max(0, timestamp - now);
}

export function isExpiringSoon(permit: ExpirySubject, now: number = Date.now()): boolean {
  if (permit.status !== 'ACTIVE') return false;

  const timestamp = parseExpiryTimestamp(permit.validUntil);

  if (timestamp === null) return false;

  const remaining = timestamp - now;
  return remaining > 0 && remaining <= EXPIRY_WARNING_WINDOW_MS;
}

export function getExpiryState(permit: ExpirySubject, now: number = Date.now()): ExpiryState {
  if (permit.status === 'EXPIRED') return 'expired';
  if (permit.status !== 'ACTIVE') return 'not-applicable';

  const timestamp = parseExpiryTimestamp(permit.validUntil);

  if (timestamp === null) return 'unknown';

  const remaining = timestamp - now;

  if (remaining <= 0) return 'expired';
  if (remaining <= EXPIRY_WARNING_WINDOW_MS) return 'expiring-soon';

  return 'active';
}

export function getExpiringSoonPermits(permits: Permit[], now: number = Date.now()): Permit[] {
  return permits.filter((permit) => isExpiringSoon(permit, now));
}

function formatDuration(remainingMs: number, compact: boolean): string {
  const totalMinutes = Math.floor(remainingMs / 60_000);

  if (totalMinutes < 1) return compact ? '<1m' : 'less than a minute';

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days) parts.push(compact ? `${days}d` : `${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours) parts.push(compact ? `${hours}h` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes) {
    parts.push(compact ? `${minutes}m` : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }

  return parts.join(' ');
}

export function formatCountdown(remainingMs: number | null): string {
  if (remainingMs === null) return 'Expiry time unavailable';
  if (remainingMs <= 0) return 'Expired';

  return `Expires in ${formatDuration(remainingMs, false)}`;
}

export function formatCountdownShort(remainingMs: number | null): string {
  if (remainingMs === null) return 'No expiry time';
  if (remainingMs <= 0) return 'Expired';

  return formatDuration(remainingMs, true);
}
