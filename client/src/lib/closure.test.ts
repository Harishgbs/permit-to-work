import type { Permit, PublicUser, Role } from '../types/api';
import { describe, expect, it } from 'vitest';
import {
  buildVerifyPayload,
  canClosePermit,
  canVerifyClosure,
  validateCompletionNotes,
} from './closure';

function makeUser(role: Role, id = 'user-1'): PublicUser {
  return {
    id,
    name: `Test ${role}`,
    email: `${role.toLowerCase()}@example.com`,
    role,
    areaId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makePermit(overrides: Partial<Permit> = {}): Permit {
  return {
    id: 'permit-1',
    permitNumber: 'PTW-000001',
    type: 'HOT_WORK',
    requesterId: 'requester-1',
    contractorTeam: 'Contractors',
    workDescription: 'Work description',
    plantId: 'plant-1',
    areaId: 'area-1',
    equipmentId: 'equipment-1',
    workLocation: 'Bay 1',
    plannedStartAt: '2026-01-01T08:00:00.000Z',
    plannedEndAt: '2026-01-01T12:00:00.000Z',
    identifiedHazards: null,
    requiredPpe: null,
    precautions: null,
    status: 'ACTIVE',
    typeData: {} as Permit['typeData'],
    validUntil: null,
    completionNotes: null,
    verificationAreaClean: null,
    verificationComment: null,
    verifiedById: null,
    verifiedAt: null,
    version: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    requester: makeUser('REQUESTER', 'requester-1'),
    plant: { id: 'plant-1', name: 'Plant' },
    area: { id: 'area-1', name: 'Area' },
    equipment: null,
    verifiedBy: null,
    approvals: [],
    _count: { workLogs: 0 },
    ...overrides,
  };
}

describe('closure workflow validation', () => {
  it('rejects empty completion notes and accepts trimmed notes', () => {
    expect(() => validateCompletionNotes('   ')).toThrow('Completion notes are required.');
    expect(validateCompletionNotes('  Work complete  ')).toBe('Work complete');
  });

  it('requires area clean confirmation for verification', () => {
    expect(() => buildVerifyPayload(false, 'Inspected')).toThrow(
      'Confirm the work area is clean and safe.',
    );
    expect(buildVerifyPayload(true, '  Area inspected  ')).toEqual({
      areaClean: true,
      comment: 'Area inspected',
    });
  });
});

describe('closure action availability', () => {
  it('allows the requester to close their own active permit', () => {
    expect(canClosePermit(makeUser('REQUESTER', 'requester-1'), makePermit())).toBe(true);
  });

  it('prevents another requester from closing the permit', () => {
    expect(canClosePermit(makeUser('REQUESTER', 'requester-2'), makePermit())).toBe(false);
  });

  it('allows a safety officer to verify a closed permit', () => {
    expect(
      canVerifyClosure(
        makeUser('SAFETY_OFFICER', 'safety-1'),
        makePermit({ status: 'CLOSED', completionNotes: 'Work complete' }),
      ),
    ).toBe(true);
  });

  it('prevents the requester from performing safety verification', () => {
    expect(
      canVerifyClosure(
        makeUser('REQUESTER', 'requester-1'),
        makePermit({ status: 'CLOSED', completionNotes: 'Work complete' }),
      ),
    ).toBe(false);
  });

  it('does not offer verification before the permit is closed', () => {
    expect(canVerifyClosure(makeUser('SAFETY_OFFICER', 'safety-1'), makePermit())).toBe(false);
  });
});
