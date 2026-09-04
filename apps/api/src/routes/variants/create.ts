import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../plugins/authenticate";

const createVariantSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(100),
  price: z.number().int().positive(),
  currency: z.string().length(3).default("INR"),
  quantity: z.number().int().nonnegative().default(0),
});

export async function createVariantRoute(app: FastifyInstance) {
  app.post(
    "/products/:productId/variants",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = createVariantSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parsed.error.flatten(),
        });
      }

      const { merchantId } = request.user;

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

      const existingSku = await prisma.productVariant.findUnique({
        where: {
          sku: parsed.data.sku,
        },
      });

      if (existingSku) {
        return reply.status(409).send({
          error: "SKU already exists",
        });
      }

      const variant = await prisma.productVariant.create({
        data: {
          productId,
          name: parsed.data.name,
          sku: parsed.data.sku,
          price: parsed.data.price,
          currency: parsed.data.currency,
          inventory: {
            create: {
              quantity: parsed.data.quantity,
            },
          },
        },
        include: {
          inventory: true,
        },
      });

      return reply.status(201).send({
        variant,
      });
    }
  );
}