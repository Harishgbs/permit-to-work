import { describe, expect, it } from 'vitest';
import { canDecideApproval, canResumePermit } from './permissions';
import type { Approval, Permit, PublicUser, Role } from '../types/api';

const REQUESTER_ID = 'user-requester';
const AREA_ID = 'area-1';
const OTHER_AREA_ID = 'area-2';

function user(role: Role, id = `user-${role.toLowerCase()}`, areaId: string | null = AREA_ID): PublicUser {
  return {
    id,
    name: role,
    email: `${role.toLowerCase()}@example.com`,
    role,
    areaId,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function approval(requiredRole: Role, status: Approval['status'] = 'PENDING'): Approval {
  return {
    id: `approval-${requiredRole}`,
    permitId: 'permit-1',
    approverId: null,
    requiredRole,
    step: 1,
    status,
    comment: null,
    decidedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function permit(options: {
  requesterId?: string;
  areaId?: string;
  status?: Permit['status'];
  approvals?: Approval[];
} = {}): Permit {
  return {
    id: 'permit-1',
    permitNumber: 'PTW-2026-000001',
    type: 'HOT_WORK',
    requesterId: options.requesterId ?? REQUESTER_ID,
    contractorTeam: 'North Maintenance',
    workDescription: 'Replace pump bearing',
    plantId: 'plant-1',
    areaId: options.areaId ?? AREA_ID,
    equipmentId: 'equipment-1',
    workLocation: 'Maintenance Bay A',
    plannedStartAt: '2026-11-24T08:00:00.000Z',
    plannedEndAt: '2026-11-24T10:00:00.000Z',
    identifiedHazards: 'Sparks',
    requiredPpe: 'FR clothing',
    precautions: 'Fire watch',
    status: options.status ?? 'PENDING_APPROVAL',
    typeData: {
      hotWorkType: 'WELDING',
      fireWatch: true,
      extinguisherType: 'CO2',
      combustiblesClearanceRadiusMetres: 11,
      gasReadings: {
        lel: 0,
        o2: 20.9,
        recordedAt: '2026-11-24T07:45:00.000Z',
      },
    },
    validUntil: null,
    completionNotes: null,
    verificationAreaClean: null,
    verificationComment: null,
    verifiedById: null,
    verifiedAt: null,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    requester: {
      id: REQUESTER_ID,
      name: 'Requester',
      email: 'requester@example.com',
      role: 'REQUESTER',
    },
    plant: { id: 'plant-1', name: 'Plant A' },
    area: { id: options.areaId ?? AREA_ID, name: 'Area A' },
    equipment: { id: 'equipment-1', tag: 'PUMP-1', name: 'Pump' },
    verifiedBy: null,
    approvals: options.approvals ?? [approval('AREA_OWNER'), approval('SAFETY_OFFICER')],
    _count: { workLogs: 0 },
  };
}

describe('approval action visibility', () => {
  it('lets admin decide any pending approval step', () => {
    expect(
      canDecideApproval(user('ADMIN'), permit({ approvals: [approval('AREA_OWNER')] })),
    ).toBe(true);
    expect(
      canDecideApproval(user('ADMIN'), permit({ approvals: [approval('SAFETY_OFFICER')] })),
    ).toBe(true);
    expect(canDecideApproval(user('ADMIN'), permit({ approvals: [] }))).toBe(false);
  });

  it('prevents anyone from approving their own permit', () => {
    const adminId = 'user-admin';
    const ownPermit = permit({
      requesterId: adminId,
      approvals: [approval('AREA_OWNER')],
    });

    expect(canDecideApproval(user('ADMIN', adminId), ownPermit)).toBe(false);
    expect(canDecideApproval(user('REQUESTER', REQUESTER_ID), permit())).toBe(false);
  });

  it('keeps area owner restrictions and safety officer permissions', () => {
    const areaOwner = user('AREA_OWNER');
    const safetyOfficer = user('SAFETY_OFFICER', 'user-safety', OTHER_AREA_ID);

    expect(
      canDecideApproval(
        areaOwner,
        permit({ approvals: [approval('AREA_OWNER')], areaId: AREA_ID }),
      ),
    ).toBe(true);
    expect(
      canDecideApproval(
        areaOwner,
        permit({ approvals: [approval('AREA_OWNER')], areaId: OTHER_AREA_ID }),
      ),
    ).toBe(false);
    expect(
      canDecideApproval(
        safetyOfficer,
        permit({ approvals: [approval('SAFETY_OFFICER')], areaId: AREA_ID }),
      ),
    ).toBe(true);
  });
});

describe('resume action visibility', () => {
  it('uses the backend permit:suspend permission', () => {
    const suspended = permit({ status: 'SUSPENDED' });

    expect(canResumePermit(user('SAFETY_OFFICER'), suspended)).toBe(true);
    expect(canResumePermit(user('ADMIN'), suspended)).toBe(true);
    expect(canResumePermit(user('REQUESTER'), suspended)).toBe(false);
    expect(canResumePermit(user('AREA_OWNER'), suspended)).toBe(false);
    expect(canResumePermit(user('SAFETY_OFFICER'), permit({ status: 'ACTIVE' }))).toBe(false);
  });
});
