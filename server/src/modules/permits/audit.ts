import type { Prisma } from '@prisma/client';

type AuditData = {
  permitId: string;
  action: string;
  actorId?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  comment?: string | null;
  systemAction?: boolean;
};

export async function writeAudit(tx: Prisma.TransactionClient, data: AuditData): Promise<void> {
  await tx.auditLog.create({
    data: {
      permitId: data.permitId,
      action: data.action,
      actorId: data.actorId ?? null,
      fromValue: data.fromValue ?? null,
      toValue: data.toValue ?? null,
      comment: data.comment ?? null,
      systemAction: data.systemAction ?? false,
    },
  });
}
