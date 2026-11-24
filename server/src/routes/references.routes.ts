import { Router } from 'express';
import { prisma } from '../config/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/authorize.middleware';
import { asyncHandler } from '../utils/async-handler';

export const referencesRouter = Router();

referencesRouter.use(authenticate);

referencesRouter.get(
  '/areas',
  requirePermission('permit:read'),
  asyncHandler(async (req, res) => {
    const actor = req.authUser!;
    const areas = await prisma.area.findMany({
      where:
        actor.role === 'AREA_OWNER'
          ? { id: actor.areaId ?? '__NO_AREA__' }
          : undefined,
      select: {
        id: true,
        name: true,
        plantId: true,
        plant: { select: { name: true } },
      },
      orderBy: [{ plant: { name: 'asc' } }, { name: 'asc' }],
    });

    res.status(200).json(
      areas.map((area) => ({
        id: area.id,
        name: area.name,
        plantId: area.plantId,
        plantName: area.plant.name,
      })),
    );
  }),
);
