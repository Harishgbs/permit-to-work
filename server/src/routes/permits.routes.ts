import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { requireAreaOwnership } from '../middleware/area-access.middleware';
import { requirePermission } from '../middleware/authorize.middleware';
import { findPermitAreaId, findPermitAreaIdOrThrow } from '../modules/authorization/area-access';
import {
  activatePermit,
  approvePermit,
  cancelPermit,
  closePermit,
  rejectPermit,
  resumePermit,
  suspendPermit,
  verifyPermit,
} from '../modules/permits/lifecycle.service';
import {
  addWorkLog,
  createPermit,
  findPermitWithRelationsOrThrow,
  listPermitAudit,
  listPermits,
  submitPermit,
  updatePermit,
} from '../modules/permits/permit.service';
import {
  activationSchema,
  createPermitSchema,
  decisionSchema,
  listPermitsSchema,
  rejectionSchema,
  workLogSchema,
} from '../modules/permits/permit.validation';
import { asyncHandler } from '../utils/async-handler';
import { HttpError } from '../utils/http-error';

export const permitsRouter = Router();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value ?? {});

  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? 'Invalid request');
  }

  return result.data;
}

permitsRouter.use(authenticate);

permitsRouter.post(
  '/',
  requirePermission('permit:create'),
  asyncHandler(async (req, res) => {
    const input = parse(createPermitSchema, req.body);
    res.status(201).json(await createPermit(input, req.authUser!));
  }),
);

permitsRouter.get(
  '/',
  requirePermission('permit:read'),
  asyncHandler(async (req, res) => {
    const input = parse(listPermitsSchema, req.query);
    res.status(200).json(await listPermits(input, req.authUser!));
  }),
);

permitsRouter.get(
  '/:id',
  requirePermission('permit:read'),
  requireAreaOwnership((req) => findPermitAreaId(String(req.params.id))),
  asyncHandler(async (req, res) => {
    res.status(200).json(await findPermitWithRelationsOrThrow(String(req.params.id)));
  }),
);

permitsRouter.get(
  '/:id/audit',
  requirePermission('permit:read'),
  requireAreaOwnership((req) => findPermitAreaIdOrThrow(String(req.params.id))),
  asyncHandler(async (req, res) => {
    res.status(200).json(await listPermitAudit(String(req.params.id)));
  }),
);

permitsRouter.patch(
  '/:id',
  requirePermission('permit:create'),
  asyncHandler(async (req, res) => {
    const input = parse(createPermitSchema, req.body);
    res.status(200).json(await updatePermit(String(req.params.id), input, req.authUser!));
  }),
);

permitsRouter.post(
  '/:id/submit',
  requirePermission('permit:create'),
  asyncHandler(async (req, res) => {
    res.status(200).json(await submitPermit(String(req.params.id), req.authUser!));
  }),
);

permitsRouter.post(
  '/:id/approve',
  requirePermission('permit:approve'),
  asyncHandler(async (req, res) => {
    const input = parse(decisionSchema, req.body);
    res.status(200).json(await approvePermit(String(req.params.id), req.authUser!, input.comment));
  }),
);

permitsRouter.post(
  '/:id/reject',
  requirePermission('permit:approve'),
  asyncHandler(async (req, res) => {
    const input = parse(rejectionSchema, req.body);
    res.status(200).json(await rejectPermit(String(req.params.id), req.authUser!, input.reason));
  }),
);

permitsRouter.post(
  '/:id/activate',
  requirePermission('permit:activate'),
  asyncHandler(async (req, res) => {
    const input = parse(activationSchema, req.body);
    res.status(200).json(await activatePermit(String(req.params.id), req.authUser!, input));
  }),
);

permitsRouter.post(
  '/:id/suspend',
  requirePermission('permit:suspend'),
  asyncHandler(async (req, res) => {
    const input = parse(rejectionSchema, req.body);
    res.status(200).json(await suspendPermit(String(req.params.id), req.authUser!, input.reason));
  }),
);

permitsRouter.post(
  '/:id/resume',
  requirePermission('permit:suspend'),
  asyncHandler(async (req, res) => {
    const input = parse(decisionSchema, req.body);
    res.status(200).json(await resumePermit(String(req.params.id), req.authUser!, input.comment));
  }),
);

permitsRouter.post(
  '/:id/close',
  requirePermission('permit:close'),
  asyncHandler(async (req, res) => {
    const input = parse(decisionSchema, req.body);
    res.status(200).json(await closePermit(String(req.params.id), req.authUser!, input.comment));
  }),
);

permitsRouter.post(
  '/:id/verify',
  requirePermission('permit:verify'),
  asyncHandler(async (req, res) => {
    const input = parse(decisionSchema, req.body);
    res.status(200).json(await verifyPermit(String(req.params.id), req.authUser!, input.comment));
  }),
);

permitsRouter.post(
  '/:id/cancel',
  requirePermission('permit:cancel'),
  asyncHandler(async (req, res) => {
    const input = parse(rejectionSchema, req.body);
    res.status(200).json(await cancelPermit(String(req.params.id), req.authUser!, input.reason));
  }),
);

permitsRouter.post(
  '/:id/work-logs',
  requirePermission('permit:worklog'),
  asyncHandler(async (req, res) => {
    const input = parse(workLogSchema, req.body);
    res.status(201).json(await addWorkLog(String(req.params.id), input.note, req.authUser!));
  }),
);
