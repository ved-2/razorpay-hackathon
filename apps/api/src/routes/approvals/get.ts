import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@commerceos/database";
import { authenticate } from "../../plugins/authenticate";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function getApprovalRoute(app: FastifyInstance) {
  app.get(
    "/approvals/:id",
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

      return reply.send({
        approval,
      });
    }
  );
}
