import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/authenticate";

export async function listOrdersRoute(app: FastifyInstance) {
  app.get(
    "/orders",
    {
      preHandler: authenticate,
    },
    async (request) => {
      const { merchantId } = request.user;
      const { status } = (request.query as { status?: string }) || {};

      const whereClause: Record<string, unknown> = { merchantId };
      if (status) {
        whereClause.status = status;
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          customer: true,
          items: true,
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        orders,
      };
    }
  );
}
