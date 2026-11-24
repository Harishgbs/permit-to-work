import type { Prisma, Role } from '@prisma/client';

export type PermitActor = {
  id: string;
  role: Role;
  areaId: string | null;
};

export const permitInclude = {
  requester: { select: { id: true, name: true, email: true, role: true } },
  plant: { select: { id: true, name: true } },
  area: { select: { id: true, name: true } },
  equipment: { select: { id: true, tag: true, name: true } },
  approvals: { orderBy: { step: 'asc' as const } },
  _count: { select: { workLogs: true } },
} satisfies Prisma.PermitInclude;

export type PermitWithRelations = Prisma.PermitGetPayload<{ include: typeof permitInclude }>;

export interface PermitAuditEntry {
  id: string;
  permitId: string;
  action: string;
  actor: { id: string; name: string; email: string } | null;
  systemAction: boolean;
  fromValue: string | null;
  toValue: string | null;
  comment: string | null;
  timestamp: string;
}
