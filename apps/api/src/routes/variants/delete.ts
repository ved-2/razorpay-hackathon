import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/authenticate";

export async function deleteVariantRoute(app: FastifyInstance) {
  app.delete(
    "/variants/:id",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { merchantId } = request.user;

      const { id } = request.params as {
        id: string;
      };

      const variant = await prisma.productVariant.findFirst({
        where: {
          id,
          product: {
            merchantId,
          },
        },
      });

      if (!variant) {
        return reply.status(404).send({
          error: "Variant not found",
        });
      }

      await prisma.productVariant.delete({
        where: {
          id,
        },
      });

      return reply.status(204).send();
    }
  );
}