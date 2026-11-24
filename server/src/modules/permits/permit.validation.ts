import { z } from 'zod';

const requiredText = z.string().trim().min(1);
const isoDate = z.coerce.date();

const sharedPermitFields = {
  contractorTeam: requiredText,
  workDescription: requiredText,
  plantId: z.uuid(),
  areaId: z.uuid(),
  equipmentId: z.uuid(),
  workLocation: requiredText,
  plannedStartAt: isoDate,
  plannedEndAt: isoDate,
  identifiedHazards: requiredText,
  requiredPpe: requiredText,
  precautions: requiredText,
};

const hotWorkSchema = z.object({
  hotWorkType: z.enum(['WELDING', 'GRINDING', 'CUTTING', 'SOLDERING']),
  fireWatch: z.boolean(),
  extinguisherType: requiredText,
  combustiblesClearanceRadiusMetres: z.number().positive(),
  gasReadings: z.object({
    lel: z.number().min(0).max(100),
    o2: z.number().min(0).max(100),
    recordedAt: isoDate,
  }),
});

const confinedSpaceSchema = z.object({
  spaceId: requiredText,
  entryPoint: requiredText,
  atmosphericReadings: z.object({
    o2: z.number().min(0).max(100),
    lel: z.number().min(0).max(100),
    h2s: z.number().min(0),
    co: z.number().min(0),
    recordedAt: isoDate,
  }),
  attendant: requiredText,
  rescuePlan: requiredText,
  ventilation: requiredText,
  entryExitLog: requiredText,
});

const workingAtHeightSchema = z.object({
  heightMetres: z.number().positive(),
  accessMethod: z.enum(['SCAFFOLD', 'LADDER', 'MEWP', 'ROPE']),
  fallArrest: z.boolean(),
  anchorCheck: requiredText,
  barricading: z.boolean(),
});

const electricalLotoSchema = z.object({
  equipmentTag: requiredText,
  voltage: z.number().positive(),
  isolationPoints: z.array(requiredText).min(1),
  lockNumbers: z.array(requiredText).min(1),
  tagNumbers: z.array(requiredText).min(1),
  earthingApplied: z.boolean(),
  testedDead: z.literal(true),
  testedDeadBy: requiredText,
});

export const createPermitSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('HOT_WORK'),
      ...sharedPermitFields,
      typeData: hotWorkSchema,
    }),
    z.object({
      type: z.literal('CONFINED_SPACE'),
      ...sharedPermitFields,
      typeData: confinedSpaceSchema,
    }),
    z.object({
      type: z.literal('WORKING_AT_HEIGHT'),
      ...sharedPermitFields,
      typeData: workingAtHeightSchema,
    }),
    z.object({
      type: z.literal('ELECTRICAL_LOTO'),
      ...sharedPermitFields,
      typeData: electricalLotoSchema,
    }),
  ])
  .superRefine((value, ctx) => {
    if (value.plannedEndAt <= value.plannedStartAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['plannedEndAt'],
        message: 'Planned end must be after planned start',
      });
    }
  });

export const updatePermitSchema = createPermitSchema;

export const listPermitsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'ACTIVE',
    'SUSPENDED',
    'REJECTED',
    'EXPIRED',
    'CLOSED',
    'CLOSED_VERIFIED',
    'CANCELLED',
  ]).optional(),
  type: z.enum(['HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'ELECTRICAL_LOTO']).optional(),
  plantId: z.uuid().optional(),
  areaId: z.uuid().optional(),
  search: z.string().trim().optional(),
});

export const decisionSchema = z.object({
  comment: z.string().trim().optional(),
});

export const rejectionSchema = z.object({
  reason: requiredText,
});

export const activationSchema = z.object({
  validUntil: isoDate.optional(),
  comment: z.string().trim().optional(),
});

export const workLogSchema = z.object({
  note: requiredText,
});

export type CreatePermitInput = z.infer<typeof createPermitSchema>;
export type ListPermitsInput = z.infer<typeof listPermitsSchema>;
