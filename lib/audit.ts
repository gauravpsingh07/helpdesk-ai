import { prisma } from './db/client';
import { Prisma } from './generated/prisma/client';

export type AuditParams = {
  tenantId: string;
  actorId?: string | null;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
};

/** Append an immutable audit-log entry. Used for every sensitive/AI action. */
export async function audit(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId ?? null,
      action: params.action,
      target: params.target,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
