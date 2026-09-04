import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/authenticate";

export async function getProductRoute(app: FastifyInstance) {
  app.get(
    "/products/:id",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { merchantId } = request.user as {
        userId: string;
        merchantId: string;
        role: string;
      };

      const { id } = request.params as {
        id: string;
      };

      const product = await prisma.product.findFirst({
        where: {
          id,
          merchantId,
        },
        include: {
          variants: {
            include: {
              inventory: true,
            },
          },
        },
      });

      if (!product) {
        return reply.status(404).send({
          error: "Product not found",
        });
      }

      return {
        product,
      };
    }
  );
}