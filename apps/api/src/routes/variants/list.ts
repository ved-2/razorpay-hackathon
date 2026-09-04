import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/authenticate";

export async function listVariantsRoute(app: FastifyInstance) {
  app.get(
    "/products/:productId/variants",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { merchantId } = request.user as {
        userId: string;
        merchantId: string;
        role: string;
      };

      const { productId } = request.params as {
        productId: string;
      };

      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          merchantId,
        },
      });

      if (!product) {
        return reply.status(404).send({
          error: "Product not found",
        });
      }

      const variants = await prisma.productVariant.findMany({
        where: {
          productId,
        },
        include: {
          inventory: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        variants,
      };
    }
  );
}