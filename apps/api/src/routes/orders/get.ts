import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/authenticate";
import { env } from "../../config/env";

export async function getOrderRoute(app: FastifyInstance) {
  app.get(
    "/orders/:id",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { merchantId } = request.user;
      const { id } = request.params as { id: string };

      const order = await prisma.order.findFirst({
        where: {
          id,
          merchantId,
        },
        include: {
          customer: true,
          items: true,
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!order) {
        return reply.status(404).send({
          error: "Order not found",
        });
      }

      return {
        order,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
      };
    }
  );
}
