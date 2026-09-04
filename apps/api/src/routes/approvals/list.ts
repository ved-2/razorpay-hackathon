import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@commerceos/database";
import { authenticate } from "../../plugins/authenticate";

const querySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export async function listApprovalsRoute(app: FastifyInstance) {
  app.get(
    "/approvals",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = querySchema.safeParse(request.query);
      const statusFilter = parsed.success ? parsed.data.status : undefined;
      const { merchantId } = request.user;

      const approvals = await prisma.approval.findMany({
        where: {
          merchantId,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reply.send({
        approvals,
      });
    }
  );
}
