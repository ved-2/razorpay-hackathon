import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../plugins/authenticate";

const updateVariantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
});

export async function updateVariantRoute(app: FastifyInstance) {
  app.patch(
    "/variants/:id",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = updateVariantSchema.safeParse(request.body);

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

      const updatedVariant = await prisma.productVariant.update({
        where: {
          id,
        },
        data: parsed.data,
        include: {
          inventory: true,
        },
      });

      return {
        variant: updatedVariant,
      };
    }
  );
}