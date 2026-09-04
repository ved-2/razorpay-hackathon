import { prisma, AuditAction } from "@commerceos/database";

export interface RecordAuditEventInput {
  merchantId: string;
  actorType: "USER" | "AI_AGENT" | "WEBHOOK" | "SYSTEM";
  actorId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(input: RecordAuditEventInput) {
  try {
    return await prisma.auditEvent.create({
      data: {
        merchantId: input.merchantId,
        actorType: input.actorType,
        actorId: input.actorId || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        metadata: (input.metadata as any) || null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit event:", error);
    return null;
  }
}

export async function getAuditTrail(
  merchantId: string,
  options?: {
    entity?: string;
    entityId?: string;
    action?: AuditAction;
    limit?: number;
  }
) {
  return prisma.auditEvent.findMany({
    where: {
      merchantId,
      ...(options?.entity ? { entity: options.entity } : {}),
      ...(options?.entityId ? { entityId: options.entityId } : {}),
      ...(options?.action ? { action: options.action } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: options?.limit ?? 50,
  });
}
