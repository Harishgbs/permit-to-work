import { prisma } from '../../config/prisma';

export async function canAccessArea(
  user: { role: string; areaId: string | null },
  areaId: string,
): Promise<boolean> {
  if (user.role !== 'AREA_OWNER') {
    return true;
  }

  if (!user.areaId) {
    return false;
  }

  const area = await prisma.area.findUnique({ where: { id: areaId }, select: { id: true } });

  return area?.id === user.areaId;
}

export async function findPermitAreaId(permitId: string): Promise<string | null> {
  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
    select: { areaId: true },
  });

  return permit?.areaId ?? null;
}
