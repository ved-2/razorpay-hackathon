import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../plugins/authenticate";

const inventorySchema = z.object({
  quantity: z.number().int().nonnegative(),
});

export async function updateInventoryRoute(app: FastifyInstance) {
  app.patch(
    "/variants/:id/inventory",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = inventorySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parsed.error.flatten(),
        });
      }

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

      const inventory = await prisma.inventory.update({
        where: {
          variantId: id,
        },
        data: {
          quantity: parsed.data.quantity,
        },
      });

      return {
        inventory,
      };
    }
  );
}
