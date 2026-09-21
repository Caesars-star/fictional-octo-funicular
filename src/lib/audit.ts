import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface LogAuditInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Records an immutable audit trail entry. Never throws into the caller's
 * request path — a logging failure must not block the underlying action.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record audit log", { input, error });
  }
}
