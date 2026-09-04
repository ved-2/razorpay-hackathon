import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/authenticate";

export async function deleteProductRoute(app: FastifyInstance) {
  app.delete(
    "/products/:id",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { merchantId } = request.user;

      const { id } = request.params as {
        id: string;
      };

      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
          merchantId,
        },
      });

      if (!existingProduct) {
        return reply.status(404).send({
          error: "Product not found",
        });
      }

      await prisma.product.delete({
        where: {
          id,
        },
      });

      return reply.status(204).send();
    }
  );
}