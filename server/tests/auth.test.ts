import { randomUUID } from 'node:crypto';
import type { Role } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { errorHandler } from '../src/middleware/error.middleware';
import { authenticate } from '../src/middleware/auth.middleware';
import { requireAreaOwnership } from '../src/middleware/area-access.middleware';
import { requirePermission, requireRole } from '../src/middleware/authorize.middleware';
import { findPermitAreaId } from '../src/modules/authorization/area-access';
import { hashPassword } from '../src/utils/password';

const testPassword = 'TestPassword123!';
const unique = randomUUID();
const emailFor = (name: string) => `auth-${name.toLowerCase()}-${unique}@example.com`;

const users: Record<string, { id: string; email: string }> = {};
let plantId: string;
let areaAId: string;
let areaBId: string;
let permitId: string;
let passwordHash: string;

beforeAll(async () => {
  const plant = await prisma.plant.create({
    data: { name: `Auth Test Plant ${unique}` },
  });
  plantId = plant.id;

  const areaA = await prisma.area.create({
    data: { name: 'Test Area A', plantId },
  });
  const areaB = await prisma.area.create({
    data: { name: 'Test Area B', plantId },
  });
  areaAId = areaA.id;
  areaBId = areaB.id;

  passwordHash = await hashPassword(testPassword);

  const definitions: { key: string; role: Role; areaId: string | null }[] = [
    { key: 'requester', role: 'REQUESTER', areaId: areaAId },
    { key: 'ownerA', role: 'AREA_OWNER', areaId: areaAId },
    { key: 'ownerB', role: 'AREA_OWNER', areaId: areaBId },
    { key: 'safety', role: 'SAFETY_OFFICER', areaId: null },
    { key: 'admin', role: 'ADMIN', areaId: null },
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
  }

  const permit = await prisma.permit.create({
    data: {
      permitNumber: `AUTH-TEST-${unique}`,
      type: 'HOT_WORK',
      requesterId: users.requester.id,
      contractorTeam: 'Auth Test Contractors',
      workDescription: 'Verify area ownership checks',
      plantId,
      areaId: areaAId,
      workLocation: 'Test Area A',
      plannedStartAt: new Date(),
      plannedEndAt: new Date(Date.now() + 60 * 60 * 1000),
      status: 'DRAFT',
    },
  });
  permitId = permit.id;
});

afterAll(async () => {
  await prisma.permit.deleteMany({ where: { id: permitId } });
  await prisma.user.deleteMany({
    where: { email: { in: Object.values(users).map((user) => user.email) } },
  });
  await prisma.area.deleteMany({ where: { plantId } });
  await prisma.plant.delete({ where: { id: plantId } });
});

async function loginAs(key: string): Promise<string> {
  const response = await request(createApp())
    .post('/api/auth/login')
    .send({ email: users[key].email, password: testPassword });

  expect(response.status).toBe(200);
  return response.body.token;
}

function roleApp(...roles: Role[]) {
  const app = express();
  app.get('/check', authenticate, requireRole(...roles), (_req, res) => {
    res.status(200).json({ allowed: true });
  });
  app.use(errorHandler);
  return app;
}

function permissionApp() {
  const app = express();
  app.get('/check', authenticate, requirePermission('user:manage'), (_req, res) => {
    res.status(200).json({ allowed: true });
  });
  app.use(errorHandler);
  return app;
}

function areaApp() {
  const app = express();
  app.get(
    '/permits/:id',
    authenticate,
    requireAreaOwnership((req) => findPermitAreaId(String(req.params.id))),
    (_req, res) => {
      res.status(200).json({ allowed: true });
    },
  );
  app.use(errorHandler);
  return app;
}

describe('POST /api/auth/login', () => {
  it('returns a token and public user for valid credentials', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: users.requester.email, password: testPassword });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user.email).toBe(users.requester.email);
    expect(response.body.user.role).toBe('REQUESTER');
  });

  it('rejects an invalid password with a generic error', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: users.requester.email, password: 'WrongPassword123!' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  it('rejects an unknown user with the same generic error', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: emailFor('missing'), password: testPassword });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  it('rejects malformed input', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
  });

  it('does not return the password hash', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: users.requester.email, password: testPassword });

    expect(response.status).toBe(200);
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(passwordHash);
  });

  it('logs in a seeded demo user from the database', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'area-owner@example.com', password: 'DemoPass123!' });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('AREA_OWNER');
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request without a token', async () => {
    const response = await request(createApp()).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required');
  });

  it('rejects an invalid token', async () => {
    const response = await request(createApp())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.value');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid or expired token');
  });

  it('returns the authenticated user', async () => {
    const token = await loginAs('requester');
    const response = await request(createApp())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(users.requester.id);
    expect(response.body.user.passwordHash).toBeUndefined();
  });
});

describe('role authorization', () => {
  it('allows the required role', async () => {
    const token = await loginAs('admin');
    const response = await request(roleApp('ADMIN'))
      .get('/check')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(true);
  });

  it('rejects the wrong role', async () => {
    const token = await loginAs('requester');
    const response = await request(roleApp('ADMIN'))
      .get('/check')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('checks permissions without duplicating role checks', async () => {
    const adminToken = await loginAs('admin');
    const safetyToken = await loginAs('safety');

    const allowed = await request(permissionApp())
      .get('/check')
      .set('Authorization', `Bearer ${adminToken}`);
    const denied = await request(permissionApp())
      .get('/check')
      .set('Authorization', `Bearer ${safetyToken}`);

    expect(allowed.status).toBe(200);
    expect(denied.status).toBe(403);
  });
});

describe('area ownership', () => {
  it('allows an area owner to access a resource in their assigned area', async () => {
    const token = await loginAs('ownerA');
    const response = await request(areaApp())
      .get(`/permits/${permitId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('blocks an area owner from another area', async () => {
    const token = await loginAs('ownerB');
    const response = await request(areaApp())
      .get(`/permits/${permitId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('ignores an area id supplied by the client', async () => {
    const token = await loginAs('ownerA');
    const response = await request(areaApp())
      .get(`/permits/${permitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ areaId: areaBId });

    expect(response.status).toBe(200);
  });
});
