import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../plugins/authenticate";

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
});

export async function createProductRoute(app: FastifyInstance) {
  app.post(
    "/products",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = createProductSchema.safeParse(request.body);

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

      const product = await prisma.product.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          merchantId,
        },
      });

      return reply.status(201).send({
        product,
      });
    }
  );
}