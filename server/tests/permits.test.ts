import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { errorHandler } from '../src/middleware/error.middleware';
import { authenticate } from '../src/middleware/auth.middleware';
import { requirePermission } from '../src/middleware/authorize.middleware';
import { expireDuePermits } from '../src/modules/permits/lifecycle.service';
import { hashPassword } from '../src/utils/password';

const unique = randomUUID();
const testPassword = 'TestPassword123!';
const emailFor = (key: string) => `permits-${key.toLowerCase()}-${unique}@example.com`;

const users: Record<string, { id: string; email: string }> = {};
const tokens: Record<string, string> = {};
let plantId: string;
let areaAId: string;
let areaBId: string;
let equipmentAId: string;
let equipmentBId: string;

function validHotWorkInput(overrides: Record<string, unknown> = {}) {
  return {
    type: 'HOT_WORK',
    contractorTeam: 'Test Contractors',
    workDescription: `Replace pump bearing ${unique}`,
    plantId,
    areaId: areaAId,
    equipmentId: equipmentAId,
    workLocation: 'Maintenance Bay A',
    plannedStartAt: new Date(Date.now() - 60_000).toISOString(),
    plannedEndAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    identifiedHazards: 'Sparks and hot surfaces',
    requiredPpe: 'Gloves and goggles',
    precautions: 'Fire watch present',
    typeData: {
      hotWorkType: 'WELDING',
      fireWatch: true,
      extinguisherType: 'CO2',
      combustiblesClearanceRadiusMetres: 11,
      gasReadings: {
        lel: 0,
        o2: 20.9,
        recordedAt: new Date().toISOString(),
      },
    },
    ...overrides,
  };
}

function validLotoInput(overrides: Record<string, unknown> = {}) {
  return validHotWorkInput({
    type: 'ELECTRICAL_LOTO',
    typeData: {
      equipmentTag: 'MCC-7',
      voltage: 415,
      isolationPoints: ['Main breaker', 'Feeder isolator'],
      lockNumbers: ['LT-001', 'LT-002'],
      tagNumbers: ['TG-001', 'TG-002'],
      earthingApplied: true,
      testedDead: true,
      testedDeadBy: 'Electrician B',
    },
    ...overrides,
  });
}

function validHeightInput(overrides: Record<string, unknown> = {}) {
  return validHotWorkInput({
    type: 'WORKING_AT_HEIGHT',
    typeData: {
      heightMetres: 6,
      accessMethod: 'ROPE',
      fallArrest: true,
      anchorCheck: 'Certified anchor',
      barricading: true,
    },
    ...overrides,
  });
}

const post = (path: string, token: string, body: unknown = {}) =>
  request(createApp())
    .post(`/api/permits${path}`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);

const patch = (path: string, token: string, body: unknown) =>
  request(createApp())
    .patch(`/api/permits${path}`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);

const get = (path: string, token: string) =>
  request(createApp()).get(`/api/permits${path}`).set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
  const plant = await prisma.plant.create({ data: { name: `Permit Test Plant ${unique}` } });
  plantId = plant.id;

  const areaA = await prisma.area.create({ data: { name: 'Area A', plantId } });
  const areaB = await prisma.area.create({ data: { name: 'Area B', plantId } });
  areaAId = areaA.id;
  areaBId = areaB.id;

  const equipmentA = await prisma.equipment.create({
    data: { tag: `EQ-A-${unique.slice(0, 8)}`, name: 'Pump A', areaId: areaAId },
  });
  const equipmentB = await prisma.equipment.create({
    data: { tag: `EQ-B-${unique.slice(0, 8)}`, name: 'Pump B', areaId: areaBId },
  });
  equipmentAId = equipmentA.id;
  equipmentBId = equipmentB.id;

  const passwordHash = await hashPassword(testPassword);
  const definitions = [
    { key: 'requester', role: 'REQUESTER' as const, areaId: areaAId },
    { key: 'otherRequester', role: 'REQUESTER' as const, areaId: areaAId },
    { key: 'ownerA', role: 'AREA_OWNER' as const, areaId: areaAId },
    { key: 'ownerB', role: 'AREA_OWNER' as const, areaId: areaBId },
    { key: 'safety', role: 'SAFETY_OFFICER' as const, areaId: null },
    { key: 'admin', role: 'ADMIN' as const, areaId: null },
  ];

  for (const definition of definitions) {
    const user = await prisma.user.create({
      data: {
        name: `Test ${definition.key}`,
        email: emailFor(definition.key),
        passwordHash,
        role: definition.role,
        areaId: definition.areaId,
      },
    });
    users[definition.key] = { id: user.id, email: user.email };

    const login = await request(createApp())
      .post('/api/auth/login')
      .send({ email: user.email, password: testPassword });

    expect(login.status).toBe(200);
    tokens[definition.key] = login.body.token;
  }
});

async function createDraft(token = tokens.requester, overrides: Record<string, unknown> = {}) {
  const response = await post('', token, validHotWorkInput(overrides));
  expect(response.status).toBe(201);
  return response.body;
}

async function advanceToApproved(token = tokens.requester) {
  const draft = await createDraft(token);

  const submitted = await post(`/${draft.id}/submit`, token);
  expect(submitted.status).toBe(200);

  const ownerApproval = await post(`/${draft.id}/approve`, tokens.ownerA, {
    comment: 'Area checks complete',
  });
  expect(ownerApproval.status).toBe(200);

  const safetyApproval = await post(`/${draft.id}/approve`, tokens.safety, {
    comment: 'Safety checks complete',
  });
  expect(safetyApproval.status).toBe(200);

  return draft.id;
}

async function activate(permitId: string, overrides: Record<string, unknown> = {}) {
  const response = await post(`/${permitId}/activate`, tokens.safety, overrides);
  expect(response.status).toBe(200);
  return response.body;
}

async function activePermit() {
  const permitId = await advanceToApproved();
  await activate(permitId);
  return permitId;
}

function dayFromNow(days: number): Date {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function plannedDateOverrides(days: number) {
  const plannedStartAt = dayFromNow(days);
  return {
    plannedStartAt: plannedStartAt.toISOString(),
    plannedEndAt: new Date(plannedStartAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
  };
}

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

describe('permit validation and creation', () => {
  it('rejects missing type-specific fields', async () => {
    const typeData = { hotWorkType: 'WELDING' };
    const response = await post('', tokens.requester, validHotWorkInput({ typeData }));

    expect(response.status).toBe(400);
  });

  it('accepts the assignment hot work methods and rejects legacy methods', async () => {
    const baseTypeData = validHotWorkInput().typeData as Record<string, unknown>;

    for (const hotWorkType of ['WELDING', 'GRINDING', 'CUTTING', 'SOLDERING']) {
      const response = await post(
        '',
        tokens.requester,
        validHotWorkInput({ typeData: { ...baseTypeData, hotWorkType } }),
      );
      expect(response.status).toBe(201);
    }

    for (const hotWorkType of ['BRAZING', 'OTHER']) {
      const response = await post(
        '',
        tokens.requester,
        validHotWorkInput({ typeData: { ...baseTypeData, hotWorkType } }),
      );
      expect(response.status).toBe(400);
    }
  });

  it('accepts the assignment access methods and rejects free text', async () => {
    const baseTypeData = validHeightInput().typeData as Record<string, unknown>;

    for (const accessMethod of ['SCAFFOLD', 'LADDER', 'MEWP', 'ROPE']) {
      const response = await post(
        '',
        tokens.requester,
        validHeightInput({ typeData: { ...baseTypeData, accessMethod } }),
      );
      expect(response.status).toBe(201);
    }

    const response = await post(
      '',
      tokens.requester,
      validHeightInput({ typeData: { ...baseTypeData, accessMethod: 'Rope access' } }),
    );
    expect(response.status).toBe(400);
  });

  it('requires separate isolation point, lock number and tag number lists for LOTO', async () => {
    const valid = await post('', tokens.requester, validLotoInput());
    expect(valid.status).toBe(201);
    expect(valid.body.typeData).toMatchObject({
      isolationPoints: ['Main breaker', 'Feeder isolator'],
      lockNumbers: ['LT-001', 'LT-002'],
      tagNumbers: ['TG-001', 'TG-002'],
      earthingApplied: true,
    });

    const missingTags = await post(
      '',
      tokens.requester,
      validLotoInput({
        typeData: {
          equipmentTag: 'MCC-7',
          voltage: 415,
          isolationPoints: ['Main breaker'],
          lockNumbers: ['LT-001'],
          tagNumbers: [],
          earthingApplied: true,
          testedDead: true,
          testedDeadBy: 'Electrician B',
        },
      }),
    );
    expect(missingTags.status).toBe(400);

    const legacy = await post(
      '',
      tokens.requester,
      validLotoInput({
        typeData: {
          equipmentTag: 'MCC-7',
          voltage: 415,
          isolationPoints: 2,
          lockTagNumbers: ['LT-001'],
          earthing: true,
          testedDead: true,
          testedDeadBy: 'Electrician B',
        },
      }),
    );
    expect(legacy.status).toBe(400);
  });

  it('rejects an end time before the start time', async () => {
    const response = await post(
      '',
      tokens.requester,
      validHotWorkInput({
        plannedStartAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        plannedEndAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Planned end');
  });

  it('rejects equipment from another area', async () => {
    const response = await post(
      '',
      tokens.requester,
      validHotWorkInput({ equipmentId: equipmentBId }),
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Equipment');
  });

  it('creates a draft with a generated unique permit number and audit entry', async () => {
    const first = await createDraft();
    const second = await createDraft();

    expect(first.permitNumber).toMatch(/^PTW-\d{4}-\d{6}$/);
    expect(second.permitNumber).toMatch(/^PTW-\d{4}-\d{6}$/);
    expect(first.permitNumber).not.toBe(second.permitNumber);
    expect(first.status).toBe('DRAFT');
    expect(first.requester.id).toBe(users.requester.id);

    const audit = await prisma.auditLog.findMany({
      where: { permitId: first.id, action: 'PERMIT_CREATED' },
    });

    expect(audit).toHaveLength(1);
    expect(audit[0].actorId).toBe(users.requester.id);
  });

  it('derives the requester from the token and ignores client-supplied requester ids', async () => {
    const permit = await createDraft(tokens.requester, {
      requesterId: users.admin.id,
    });

    expect(permit.requester.id).toBe(users.requester.id);
  });

  it('allows editing only draft permits', async () => {
    const permit = await createDraft();
    const updated = await patch(`/${permit.id}`, tokens.requester, {
      ...validHotWorkInput(),
      workDescription: `Updated ${unique}`,
    });

    expect(updated.status).toBe(200);
    expect(updated.body.workDescription).toBe(`Updated ${unique}`);

    await post(`/${permit.id}/submit`, tokens.requester);

    const rejected = await patch(`/${permit.id}`, tokens.requester, validHotWorkInput());
    expect(rejected.status).toBe(409);
  });

  it('prevents a requester from editing another requester’s permit', async () => {
    const permit = await createDraft();
    const response = await patch(`/${permit.id}`, tokens.otherRequester, validHotWorkInput());

    expect(response.status).toBe(403);
  });
});

describe('approval workflow', () => {
  it('creates area owner and safety officer approvals on submission', async () => {
    const permit = await createDraft();
    const response = await post(`/${permit.id}/submit`, tokens.requester);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('PENDING_APPROVAL');

    const approvals = await prisma.approval.findMany({
      where: { permitId: permit.id },
      orderBy: { step: 'asc' },
    });

    expect(approvals.map((approval) => approval.requiredRole)).toEqual([
      'AREA_OWNER',
      'SAFETY_OFFICER',
    ]);
    expect(approvals.every((approval) => approval.status === 'PENDING')).toBe(true);
  });

  it('moves to approved only after both approvals', async () => {
    const permit = await createDraft();
    await post(`/${permit.id}/submit`, tokens.requester);

    const first = await post(`/${permit.id}/approve`, tokens.ownerA, { comment: 'Area ok' });
    expect(first.body.status).toBe('PENDING_APPROVAL');

    const second = await post(`/${permit.id}/approve`, tokens.safety, { comment: 'Safety ok' });
    expect(second.body.status).toBe('APPROVED');

    const approvals = await prisma.approval.findMany({ where: { permitId: permit.id } });
    expect(approvals.every((approval) => approval.status === 'APPROVED')).toBe(true);
  });

  it('blocks area owners from other areas and allows safety officers across areas', async () => {
    const permit = await createDraft(tokens.requester, {
      areaId: areaBId,
      equipmentId: equipmentBId,
      workLocation: 'Area B',
    });

    await post(`/${permit.id}/submit`, tokens.requester);

    const wrongOwner = await post(`/${permit.id}/approve`, tokens.ownerA);
    expect(wrongOwner.status).toBe(403);

    const rightOwner = await post(`/${permit.id}/approve`, tokens.ownerB);
    expect(rightOwner.status).toBe(200);

    const safety = await post(`/${permit.id}/approve`, tokens.safety);
    expect(safety.status).toBe(200);
    expect(safety.body.status).toBe('APPROVED');
  });

  it('prevents self-approval even for administrators', async () => {
    const permit = await createDraft(tokens.admin);
    await post(`/${permit.id}/submit`, tokens.admin);

    const response = await post(`/${permit.id}/approve`, tokens.admin);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('own permit');
  });

  it('rejects a permit and records the rejection', async () => {
    const permit = await createDraft();
    await post(`/${permit.id}/submit`, tokens.requester);

    const ownerApproval = await post(`/${permit.id}/approve`, tokens.ownerA);
    expect(ownerApproval.status).toBe(200);

    const rejected = await post(`/${permit.id}/reject`, tokens.safety, {
      reason: 'Atmospheric readings incomplete',
    });

    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe('REJECTED');

    const audit = await prisma.auditLog.findFirst({
      where: { permitId: permit.id, action: 'PERMIT_REJECTED' },
    });
    expect(audit?.comment).toContain('Atmospheric readings incomplete');
  });
});

describe('activation and work logs', () => {
  it('blocks activation before planned start and records activation', async () => {
    const permit = await createDraft(tokens.requester, {
      plannedStartAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      plannedEndAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });
    await post(`/${permit.id}/submit`, tokens.requester);
    await post(`/${permit.id}/approve`, tokens.ownerA);
    await post(`/${permit.id}/approve`, tokens.safety);

    const early = await post(`/${permit.id}/activate`, tokens.safety);
    expect(early.status).toBe(409);
    expect(early.body.error).toContain('planned start');

    const started = await prisma.permit.update({
      where: { id: permit.id },
      data: { plannedStartAt: new Date(Date.now() - 60_000) },
    });
    expect(started.id).toBe(permit.id);

    const activated = await activate(permit.id);
    expect(activated.status).toBe('ACTIVE');
    expect(activated.validUntil).toBeTruthy();
  });

  it('only accepts work logs while active and records the actor', async () => {
    const permit = await createDraft();

    const tooEarly = await post(`/${permit.id}/work-logs`, tokens.requester, {
      note: 'Should fail',
    });
    expect(tooEarly.status).toBe(409);

    const approvedId = await advanceToApproved();
    await activate(approvedId);

    const logged = await post(`/${approvedId}/work-logs`, tokens.requester, {
      note: `Bearing replaced ${unique}`,
    });

    expect(logged.status).toBe(201);
    expect(logged.body.note).toContain(unique);

    const log = await prisma.workLog.findUnique({ where: { id: logged.body.id } });
    expect(log?.actorId).toBe(users.requester.id);

    const audit = await prisma.auditLog.findFirst({
      where: { permitId: approvedId, action: 'WORK_LOG_ADDED' },
    });
    expect(audit?.comment).toContain(unique);
  });
});

describe('suspension, expiry and closure', () => {
  it('suspends and resumes an active permit', async () => {
    const permitId = await advanceToApproved();
    await activate(permitId);

    const suspended = await post(`/${permitId}/suspend`, tokens.safety, {
      reason: 'Gas reading out of range',
    });
    expect(suspended.body.status).toBe('SUSPENDED');

    const resumed = await post(`/${permitId}/resume`, tokens.safety, {
      comment: 'Gas readings repeated',
    });
    expect(resumed.body.status).toBe('ACTIVE');
  });

  it('expires due permits automatically and blocks reactivation', async () => {
    const permitId = await advanceToApproved();
    await activate(permitId);

    await prisma.permit.update({
      where: { id: permitId },
      data: { validUntil: new Date(Date.now() - 1000) },
    });

    const suspended = await post(`/${permitId}/suspend`, tokens.safety, { reason: 'Weather' });
    expect(suspended.status).toBe(200);

    const expiredCount = await expireDuePermits();
    expect(expiredCount).toBeGreaterThan(0);

    const expired = await get(`/${permitId}`, tokens.requester);
    expect(expired.body.status).toBe('EXPIRED');

    const resumed = await post(`/${permitId}/resume`, tokens.safety);
    expect(resumed.status).toBe(409);
    expect(resumed.body.error).toContain('create a new permit');

    const audit = await prisma.auditLog.findFirst({
      where: { permitId, action: 'PERMIT_EXPIRED' },
    });
    expect(audit?.systemAction).toBe(true);
    expect(audit?.actorId).toBeNull();
  });

  it('rejects empty completion notes when closing work', async () => {
    const permitId = await activePermit();

    const response = await post(`/${permitId}/close`, tokens.requester, {
      completionNotes: '   ',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Completion notes are required');

    const permit = await prisma.permit.findUniqueOrThrow({ where: { id: permitId } });
    expect(permit.status).toBe('ACTIVE');
    expect(permit.completionNotes).toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { permitId, action: 'PERMIT_CLOSED' },
    });
    expect(audit).toBeNull();
  });

  it('stores completion notes on the permit and in audit history', async () => {
    const permitId = await activePermit();
    const completionNotes = 'Pump bearing replaced; no hot work remaining';

    const response = await post(`/${permitId}/close`, tokens.requester, {
      completionNotes: `  ${completionNotes}  `,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'CLOSED',
      completionNotes,
      verificationAreaClean: null,
      verifiedById: null,
    });

    const permit = await prisma.permit.findUniqueOrThrow({ where: { id: permitId } });
    expect(permit.completionNotes).toBe(completionNotes);

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { permitId, action: 'PERMIT_CLOSED' },
    });
    expect(audit.comment).toBe(completionNotes);
    expect(audit.actorId).toBe(users.requester.id);
  });

  it('prevents an unauthorized requester from closing the permit', async () => {
    const permitId = await activePermit();

    const response = await post(`/${permitId}/close`, tokens.otherRequester, {
      completionNotes: 'Work complete',
    });

    expect(response.status).toBe(403);

    const permit = await prisma.permit.findUniqueOrThrow({ where: { id: permitId } });
    expect(permit.status).toBe('ACTIVE');
  });

  it('requires area clean confirmation and records successful verification', async () => {
    const permitId = await activePermit();
    const closed = await post(`/${permitId}/close`, tokens.requester, {
      completionNotes: 'Work complete and tools removed',
    });
    expect(closed.status).toBe(200);

    const rejected = await post(`/${permitId}/verify`, tokens.safety, {
      areaClean: false,
    });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toContain('clean and safe');

    const verified = await post(`/${permitId}/verify`, tokens.safety, {
      areaClean: true,
      comment: 'Area inspected and cleared',
    });

    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({
      status: 'CLOSED_VERIFIED',
      completionNotes: 'Work complete and tools removed',
      verificationAreaClean: true,
      verificationComment: 'Area inspected and cleared',
      verifiedById: users.safety.id,
    });

    const permit = await prisma.permit.findUniqueOrThrow({ where: { id: permitId } });
    expect(permit.status).toBe('CLOSED_VERIFIED');
    expect(permit.verificationAreaClean).toBe(true);
    expect(permit.verifiedAt).not.toBeNull();

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { permitId, action: 'PERMIT_VERIFIED' },
    });
    expect(audit.actorId).toBe(users.safety.id);
    expect(audit.comment).toContain('clean and safe');
    expect(audit.comment).toContain('Area inspected and cleared');
  });

  it('prevents the requester from performing safety verification', async () => {
    const permitId = await activePermit();
    const closed = await post(`/${permitId}/close`, tokens.requester, {
      completionNotes: 'Work complete',
    });
    expect(closed.status).toBe(200);

    const response = await post(`/${permitId}/verify`, tokens.requester, {
      areaClean: true,
    });

    expect(response.status).toBe(403);

    const permit = await prisma.permit.findUniqueOrThrow({ where: { id: permitId } });
    expect(permit.status).toBe('CLOSED');
    expect(permit.verificationAreaClean).toBeNull();
  });

  it('cancels non-terminal permits and blocks later transitions', async () => {
    const permit = await createDraft();
    const cancelled = await post(`/${permit.id}/cancel`, tokens.requester, {
      reason: 'Schedule changed',
    });

    expect(cancelled.body.status).toBe('CANCELLED');

    const submitted = await post(`/${permit.id}/submit`, tokens.requester);
    expect(submitted.status).toBe(409);
  });

  it('rejects illegal transitions through the shared state machine', async () => {
    const permitId = await advanceToApproved();
    await activate(permitId);

    const activatedAgain = await post(`/${permitId}/activate`, tokens.safety);
    expect(activatedAgain.status).toBe(409);
    expect(activatedAgain.body.error).toContain('Cannot change permit status');
  });
});

describe('permit list filters', () => {
  it('filters by real area id in the database query', async () => {
    const token = `area-filter-${unique.slice(0, 8)}`;
    const inAreaA = await createDraft(tokens.requester, {
      ...plannedDateOverrides(0),
      workDescription: `${token} area a`,
      areaId: areaAId,
      equipmentId: equipmentAId,
    });
    const inAreaB = await createDraft(tokens.requester, {
      ...plannedDateOverrides(0),
      workDescription: `${token} area b`,
      areaId: areaBId,
      equipmentId: equipmentBId,
    });

    const params = new URLSearchParams({ pageSize: '100', search: token, areaId: areaBId });
    const response = await get(`?${params.toString()}`, tokens.admin);

    expect(response.status).toBe(200);
    expect(response.body.data.map((permit: { id: string }) => permit.id)).toEqual([inAreaB.id]);
    expect(response.body.data[0].areaId).toBe(areaBId);
    expect(response.body.data[0].id).not.toBe(inAreaA.id);
  });

  it('filters by planned start date inclusively', async () => {
    const token = `date-filter-${unique.slice(0, 8)}`;
    const before = await createDraft(tokens.requester, {
      ...plannedDateOverrides(-1),
      workDescription: `${token} before`,
    });
    const inside = await createDraft(tokens.requester, {
      ...plannedDateOverrides(0),
      workDescription: `${token} inside`,
    });
    const after = await createDraft(tokens.requester, {
      ...plannedDateOverrides(1),
      workDescription: `${token} after`,
    });
    const day = dateKey(dayFromNow(0));

    const params = new URLSearchParams({
      pageSize: '100',
      search: token,
      startDate: day,
      endDate: day,
    });
    const response = await get(`?${params.toString()}`, tokens.admin);

    expect(response.status).toBe(200);
    expect(response.body.data.map((permit: { id: string }) => permit.id)).toEqual([inside.id]);
    expect(response.body.data.some((permit: { id: string }) => permit.id === before.id)).toBe(false);
    expect(response.body.data.some((permit: { id: string }) => permit.id === after.id)).toBe(false);
  });

  it('combines status, type, area, date range and search filters', async () => {
    const token = `combined-filter-${unique.slice(0, 8)}`;
    const day = dateKey(dayFromNow(0));
    const common = {
      ...plannedDateOverrides(0),
      workDescription: token,
      areaId: areaAId,
      equipmentId: equipmentAId,
    };
    const matching = await createDraft(tokens.requester, common);
    await createDraft(tokens.requester, {
      ...common,
      ...validLotoInput({ workDescription: token, areaId: areaAId, equipmentId: equipmentAId }),
    });
    await createDraft(tokens.requester, {
      ...common,
      areaId: areaBId,
      equipmentId: equipmentBId,
    });
    await createDraft(tokens.requester, {
      ...common,
      ...plannedDateOverrides(3),
    });

    const params = new URLSearchParams({
      pageSize: '100',
      status: 'DRAFT',
      type: 'HOT_WORK',
      areaId: areaAId,
      startDate: day,
      endDate: day,
      search: token,
    });
    const response = await get(`?${params.toString()}`, tokens.admin);

    expect(response.status).toBe(200);
    expect(response.body.data.map((permit: { id: string }) => permit.id)).toEqual([matching.id]);
  });

  it('rejects invalid date ranges and malformed dates', async () => {
    const first = dateKey(dayFromNow(1));
    const second = dateKey(dayFromNow(0));

    const reversed = await get(`?startDate=${first}&endDate=${second}`, tokens.admin);
    expect(reversed.status).toBe(400);
    expect(reversed.body.error).toContain('End date must be on or after start date');

    const malformed = await get('?startDate=24-11-2026', tokens.admin);
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toContain('YYYY-MM-DD');
  });

  it('keeps area-owner scoping when an area filter is supplied', async () => {
    const response = await get(`?pageSize=100&areaId=${areaBId}`, tokens.ownerA);

    expect(response.status).toBe(200);
    expect(response.body.data.every((permit: { areaId: string }) => permit.areaId === areaAId)).toBe(
      true,
    );
  });
});

describe('area reference data', () => {
  it('returns real areas from the database scoped by role', async () => {
    const admin = await request(createApp())
      .get('/api/references/areas')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(admin.status).toBe(200);

    const ids = admin.body.map((area: { id: string }) => area.id);
    expect(ids).toContain(areaAId);
    expect(ids).toContain(areaBId);
    expect(
      admin.body.every((area: { plantName: string }) => typeof area.plantName === 'string'),
    ).toBe(true);

    const owner = await request(createApp())
      .get('/api/references/areas')
      .set('Authorization', `Bearer ${tokens.ownerA}`);
    expect(owner.status).toBe(200);
    expect(owner.body.map((area: { id: string }) => area.id)).toEqual([areaAId]);
  });

  it('requires authentication', async () => {
    const response = await request(createApp()).get('/api/references/areas');
    expect(response.status).toBe(401);
  });
});

describe('authorization and audit', () => {
  it('restricts area owners to their area in list results', async () => {
    const response = await get('?pageSize=100', tokens.ownerA);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((permit: { areaId: string }) => permit.areaId === areaAId)).toBe(
      true,
    );
  });

  it('requires the correct permission for lifecycle actions', () => {
    const app = express();
    app.get(
      '/check',
      authenticate,
      requirePermission('user:manage'),
      (_req, res) => res.status(200).json({ ok: true }),
    );
    app.use(errorHandler);

    return request(app)
      .get('/check')
      .set('Authorization', `Bearer ${tokens.requester}`)
      .expect(403);
  });

  it('keeps audit entries immutable', async () => {
    const permit = await createDraft();
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { permitId: permit.id, action: 'PERMIT_CREATED' },
    });

    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE "AuditLog" SET "comment" = $1 WHERE id = $2',
        'tampered',
        audit.id,
      ),
    ).rejects.toThrow();
  });
});

describe('permit audit history', () => {
  it('returns audit records in chronological order with actor details', async () => {
    const permit = await createDraft();
    await createDraft();
    await post(`/${permit.id}/submit`, tokens.requester);

    const response = await get(`/${permit.id}/audit`, tokens.admin);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((entry: { action: string }) => entry.action)).toEqual([
      'PERMIT_CREATED',
      'PERMIT_SUBMITTED',
    ]);
    expect(response.body.every((entry: { permitId: string }) => entry.permitId === permit.id)).toBe(
      true,
    );
    expect(response.body[0].actor).toMatchObject({
      name: 'Test requester',
      email: emailFor('requester'),
    });
    expect(response.body[1]).toMatchObject({
      fromValue: 'DRAFT',
      toValue: 'PENDING_APPROVAL',
      systemAction: false,
    });

    const timestamps = response.body.map((entry: { timestamp: string }) =>
      new Date(entry.timestamp).getTime(),
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
  });

  it('returns an empty history when no audit records exist', async () => {
    const permit = await prisma.permit.create({
      data: {
        permitNumber: `PTW-TEST-${unique.slice(0, 8)}-EMPTY`,
        type: 'HOT_WORK',
        requesterId: users.requester.id,
        contractorTeam: 'Test Contractors',
        workDescription: `Empty audit history ${unique}`,
        plantId,
        areaId: areaAId,
        equipmentId: equipmentAId,
        workLocation: 'Maintenance Bay A',
        plannedStartAt: new Date(Date.now() - 60_000),
        plannedEndAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        identifiedHazards: 'Sparks and hot surfaces',
        requiredPpe: 'Gloves and goggles',
        precautions: 'Fire watch present',
        typeData: validHotWorkInput().typeData as Prisma.InputJsonValue,
      },
    });

    const response = await get(`/${permit.id}/audit`, tokens.admin);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('requires authentication', async () => {
    const permit = await createDraft();

    const response = await request(createApp()).get(`/api/permits/${permit.id}/audit`);

    expect(response.status).toBe(401);
  });

  it('rejects area owners from other areas', async () => {
    const permit = await createDraft();

    const response = await get(`/${permit.id}/audit`, tokens.ownerB);

    expect(response.status).toBe(403);
  });

  it('returns 404 for an unknown permit', async () => {
    const response = await get(`/${randomUUID()}/audit`, tokens.admin);

    expect(response.status).toBe(404);
  });
});
