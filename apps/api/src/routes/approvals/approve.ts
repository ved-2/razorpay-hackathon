import { FastifyInstance } from "fastify";
import { z } from "zod";
import { executeApprovalAction } from "../../services/action-executor";
import { recordAuditEvent } from "../../services/audit";
import { authenticate } from "../../plugins/authenticate";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function approveApprovalRoute(app: FastifyInstance) {
  app.post(
    "/approvals/:id/approve",
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

      try {
        const result = await executeApprovalAction(merchantId, approvalId);

        await recordAuditEvent({
          merchantId,
          actorType: "USER",
          actorId: request.user.userId,
          action: "APPROVAL_APPROVED",
          entity: "Approval",
          entityId: approvalId,
          metadata: {
            action: result.executionResult.action,
          },
        });

        await recordAuditEvent({
          merchantId,
          actorType: "SYSTEM",
          action: "ACTION_EXECUTED",
          entity: "ActionExecutor",
          entityId: approvalId,
          metadata: result.executionResult.details,
        });

        return reply.send({
          success: true,
          approval: result.approval,
          executionResult: result.executionResult,
        });
      } catch (error) {
        request.log.error(error);

        const message =
          error instanceof Error ? error.message : "Failed to execute approval";

        const statusCode = message === "Approval not found" ? 404 : 400;

        return reply.status(statusCode).send({
          error: message,
        });
      }
    }
  );
}
