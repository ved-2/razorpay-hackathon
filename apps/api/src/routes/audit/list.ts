import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getAuditTrail } from "../../services/audit";
import { authenticate } from "../../plugins/authenticate";
import { AuditAction } from "@commerceos/database";

const querySchema = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export default async function auditListRoute(app: FastifyInstance) {
  app.get(
    "/audit",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = querySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid audit query parameters",
          details: parsed.error.flatten(),
        });
      }

      const { merchantId } = request.user;
      const { entity, entityId, action, limit } = parsed.data;

      const events = await getAuditTrail(merchantId, {
        entity,
        entityId,
        action,
        limit,
      });

      return reply.send({
        events,
      });
    }
  );
}
