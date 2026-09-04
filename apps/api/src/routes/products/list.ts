import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/authenticate";

export async function listProductsRoute(app: FastifyInstance) {
  app.get(
    "/products",
    {
      preHandler: authenticate,
    },
    async (request) => {
      const { merchantId } = request.user as {
        userId: string;
        merchantId: string;
        role: string;
      };

      const products = await prisma.product.findMany({
        where: {
          merchantId,
        },
        include: {
          variants: {
            include: {
              inventory: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        products,
      };
    }
  );
}