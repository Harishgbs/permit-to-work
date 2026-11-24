import { describe, expect, it } from 'vitest';
import {
  EXPIRY_WARNING_WINDOW_MS,
  formatCountdown,
  formatCountdownShort,
  getExpiryState,
  getExpiringSoonPermits,
  getRemainingMs,
  isExpiringSoon,
} from './expiry';
import type { Permit } from '../types/api';

const MINUTE = 60_000;
const NOW = Date.parse('2026-11-24T12:00:00.000Z');

function permit(overrides: Partial<Permit> = {}): Permit {
  return {
    id: 'permit-1',
    permitNumber: 'PTW-2026-000101',
    type: 'HOT_WORK',
    requesterId: 'user-1',
    contractorTeam: 'Acme',
    workDescription: 'Replace pump bearing',
    plantId: 'plant-1',
    areaId: 'area-1',
    equipmentId: 'equipment-1',
    workLocation: 'Maintenance Bay A',
    plannedStartAt: '2026-11-24T08:00:00.000Z',
    plannedEndAt: '2026-11-24T14:00:00.000Z',
    identifiedHazards: null,
    requiredPpe: null,
    precautions: null,
    status: 'ACTIVE',
    typeData: {} as Permit['typeData'],
    validUntil: new Date(NOW + 90 * MINUTE).toISOString(),
    version: 1,
    createdAt: '2026-11-24T07:00:00.000Z',
    updatedAt: '2026-11-24T08:00:00.000Z',
    requester: {
      id: 'user-1',
      name: 'Test Requester',
      email: 'requester@example.com',
      role: 'REQUESTER',
    },
    plant: { id: 'plant-1', name: 'Plant A' },
    area: { id: 'area-1', name: 'Area A' },
    equipment: { id: 'equipment-1', tag: 'EQ-101', name: 'Pump A' },
    approvals: [],
    _count: { workLogs: 0 },
    ...overrides,
  };
}

describe('permit expiry', () => {
  it('flags an active permit expiring in 90 minutes as expiring soon', () => {
    const subject = { status: 'ACTIVE' as const, validUntil: new Date(NOW + 90 * MINUTE).toISOString() };

    expect(isExpiringSoon(subject, NOW)).toBe(true);
    expect(getExpiryState(subject, NOW)).toBe('expiring-soon');
  });

  it('does not flag an active permit expiring in 3 hours', () => {
    const subject = { status: 'ACTIVE' as const, validUntil: new Date(NOW + 3 * 60 * MINUTE).toISOString() };

    expect(isExpiringSoon(subject, NOW)).toBe(false);
    expect(getExpiryState(subject, NOW)).toBe('active');
  });

  it('includes the two-hour boundary', () => {
    const subject = {
      status: 'ACTIVE' as const,
      validUntil: new Date(NOW + EXPIRY_WARNING_WINDOW_MS).toISOString(),
    };

    expect(isExpiringSoon(subject, NOW)).toBe(true);
  });

  it('never marks expired permits as expiring soon', () => {
    const byStatus = {
      status: 'EXPIRED' as const,
      validUntil: new Date(NOW + 30 * MINUTE).toISOString(),
    };
    const byTime = {
      status: 'ACTIVE' as const,
      validUntil: new Date(NOW - MINUTE).toISOString(),
    };

    expect(isExpiringSoon(byStatus, NOW)).toBe(false);
    expect(getExpiryState(byStatus, NOW)).toBe('expired');
    expect(isExpiringSoon(byTime, NOW)).toBe(false);
    expect(getExpiryState(byTime, NOW)).toBe('expired');
  });

  it('calculates countdowns from ISO timestamps without local timezone drift', () => {
    const offsetTimestamp = '2026-11-24T22:30:00+10:00';

    expect(getRemainingMs(offsetTimestamp, NOW)).toBe(30 * MINUTE);
  });

  it('formats full and compact countdowns', () => {
    expect(formatCountdown(90 * MINUTE)).toBe('Expires in 1 hour 30 minutes');
    expect(formatCountdown(35 * MINUTE)).toBe('Expires in 35 minutes');
    expect(formatCountdown(30_000)).toBe('Expires in less than a minute');
    expect(formatCountdown(0)).toBe('Expired');
    expect(formatCountdown(-MINUTE)).toBe('Expired');
    expect(formatCountdownShort(90 * MINUTE)).toBe('1h 30m');
  });

  it('handles missing and invalid expiry values safely', () => {
    const missing = { status: 'ACTIVE' as const, validUntil: null };
    const invalid = { status: 'ACTIVE' as const, validUntil: 'not-a-date' };

    expect(getRemainingMs(missing.validUntil, NOW)).toBeNull();
    expect(getRemainingMs(invalid.validUntil, NOW)).toBeNull();
    expect(getExpiryState(missing, NOW)).toBe('unknown');
    expect(getExpiryState(invalid, NOW)).toBe('unknown');
    expect(isExpiringSoon(missing, NOW)).toBe(false);
    expect(formatCountdown(null)).toBe('Expiry time unavailable');
    expect(formatCountdownShort(null)).toBe('No expiry time');
  });

  it('filters API permits for the dashboard warning', () => {
    const soon = permit({ id: 'soon', validUntil: new Date(NOW + 30 * MINUTE).toISOString() });
    const later = permit({
      id: 'later',
      permitNumber: 'PTW-2026-000102',
      validUntil: new Date(NOW + 3 * 60 * MINUTE).toISOString(),
    });
    const expired = permit({
      id: 'expired',
      permitNumber: 'PTW-2026-000103',
      status: 'EXPIRED',
      validUntil: new Date(NOW - MINUTE).toISOString(),
    });

    expect(getExpiringSoonPermits([soon, later, expired], NOW)).toEqual([soon]);
  });
});
