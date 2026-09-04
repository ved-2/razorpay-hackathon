import { FastifyInstance } from "fastify";
import { prisma } from "@commerceos/database";
import { z } from "zod";
import { authenticate } from "../../plugins/authenticate";

const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export default async function createOrderRoute(app: FastifyInstance) {
  app.post(
    "/orders",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = createOrderSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid request",
          details: parsed.error.flatten(),
        });
      }

      const { customer, items } = parsed.data;
      const { merchantId } = request.user;

      try {
        const order = await prisma.$transaction(async (tx) => {
          const variantIds = items.map((item) => item.variantId);

          const variants = await tx.productVariant.findMany({
            where: {
              id: { in: variantIds },
              product: {
                merchantId,
              },
            },
            include: {
              product: true,
              inventory: true,
            },
          });

          if (variants.length !== variantIds.length) {
            throw new Error("One or more variants not found");
          }

          const variantMap = new Map(
            variants.map((variant) => [variant.id, variant])
          );

          let subtotal = 0;

          const orderItems = items.map((item) => {
            const variant = variantMap.get(item.variantId);

            if (!variant) {
              throw new Error("Variant not found");
            }

            const available =
              (variant.inventory?.quantity ?? 0) -
              (variant.inventory?.reserved ?? 0);

            if (available < item.quantity) {
              throw new Error(
                `Insufficient inventory for ${variant.sku}`
              );
            }

            const totalPrice = variant.price * item.quantity;
            subtotal += totalPrice;

            return {
              variantId: variant.id,
              productName: variant.product.name,
              variantName: variant.name,
              sku: variant.sku,
              quantity: item.quantity,
              unitPrice: variant.price,
              totalPrice,
            };
          });

          const existingCustomer = await tx.customer.findFirst({
            where: {
              merchantId,
              email: customer.email.toLowerCase(),
            },
          });

          const savedCustomer =
            existingCustomer ??
            (await tx.customer.create({
              data: {
                merchantId,
                name: customer.name,
                email: customer.email.toLowerCase(),
                phone: customer.phone,
              },
            }));

          const createdOrder = await tx.order.create({
            data: {
              merchantId,
              customerId: savedCustomer.id,
              status: "PENDING_PAYMENT",
              currency: "INR",
              subtotal,
              discount: 0,
              total: subtotal,
              items: {
                create: orderItems,
              },
            },
            include: {
              customer: true,
              items: true,
            },
          });

          for (const item of items) {
            const updated = await tx.inventory.updateMany({
              where: {
                variantId: item.variantId,
                quantity: {
                  gte: item.quantity,
                },
              },
              data: {
                reserved: {
                  increment: item.quantity,
                },
              },
            });

            if (updated.count !== 1) {
              throw new Error(
                `Unable to reserve inventory for variant ${item.variantId}`
              );
            }
          }

          return createdOrder;
        });

        return reply.status(201).send({
          order,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create order";

        return reply.status(400).send({
          error: message,
        });
      }
    }
  );
}