import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@commerceos/database";
import { recordAuditEvent } from "../../services/audit";
import { authenticate } from "../../plugins/authenticate";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function rejectApprovalRoute(app: FastifyInstance) {
  app.post(
    "/approvals/:id/reject",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.status(400).send({
          error: "Invalid approval ID",
        });
      }

      const { merchantId } = request.user;
      const { id: approvalId } = params.data;

      const approval = await prisma.approval.findFirst({
        where: {
          id: approvalId,
          merchantId,
        },
      });

      if (!approval) {
        return reply.status(404).send({
          error: "Approval not found",
        });
      }

      if (approval.status === "APPROVED") {
        return reply.status(400).send({
          error: "Cannot reject an already approved action",
        });
      }

      const updated = await prisma.approval.update({
        where: { id: approvalId },
        data: {
          status: "REJECTED",
        },
      });

      await recordAuditEvent({
        merchantId,
        actorType: "USER",
        actorId: request.user.userId,
        action: "APPROVAL_REJECTED",
        entity: "Approval",
        entityId: approvalId,
        metadata: {
          type: approval.type,
          title: approval.title,
        },
      });

      return reply.send({
        success: true,
        approval: updated,
      });
    }
  );
}
