import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../plugins/authenticate";

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export async function updateProductRoute(app: FastifyInstance) {
  app.patch(
    "/products/:id",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = updateProductSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parsed.error.flatten(),
        });
      }

      const { merchantId } = request.user as {
        userId: string;
        merchantId: string;
        role: string;
      };

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

      const product = await prisma.product.update({
        where: {
          id,
        },
        data: parsed.data,
      });

      return {
        product,
      };
    }
  );
}