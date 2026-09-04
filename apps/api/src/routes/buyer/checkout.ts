import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@commerceos/database";
import { paymentProvider } from "../../lib/razorpay";
import { env } from "../../config/env";
import { eventBus } from "@commerceos/events";
import { recordAuditEvent } from "../../services/audit";

const buyerCheckoutSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  policy: z
    .object({
      maxPrice: z.number().int().positive().optional(),
      currency: z.string().length(3).optional(),
    })
    .optional(),
});

export async function buyerCheckoutRoute(app: FastifyInstance) {
  app.post("/buyer/checkout", async (request, reply) => {
    const parsed = buyerCheckoutSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid buyer checkout request",
        details: parsed.error.flatten(),
      });
    }

    const { variantId, quantity, customer, policy } = parsed.data;

    try {
      // 1. Fetch variant and inventory
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
          product: true,
          inventory: true,
        },
      });

      if (!variant) {
        return reply.status(404).send({
          error: "Product variant not found",
        });
      }

      if (variant.product.status !== "ACTIVE") {
        return reply.status(400).send({
          error: "Product is not available for purchase",
        });
      }

      const availableStock =
        (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0);

      if (availableStock < quantity) {
        return reply.status(400).send({
          error: `Insufficient inventory for ${variant.name}. Available: ${availableStock}`,
        });
      }

      const totalPrice = variant.price * quantity;

      // 2. Enforce buyer budget policy
      if (policy?.maxPrice && totalPrice > policy.maxPrice) {
        return reply.status(400).send({
          error: `Order total ₹${(totalPrice / 100).toFixed(2)} exceeds buyer maximum budget ₹${(policy.maxPrice / 100).toFixed(2)}`,
        });
      }

      const merchantId = variant.product.merchantId;

      // 3. Transactionally reserve inventory and create order
      const order = await prisma.$transaction(async (tx) => {
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
            currency: variant.currency,
            subtotal: totalPrice,
            discount: 0,
            total: totalPrice,
            items: {
              create: [
                {
                  variantId: variant.id,
                  productName: variant.product.name,
                  variantName: variant.name,
                  sku: variant.sku,
                  quantity,
                  unitPrice: variant.price,
                  totalPrice,
                },
              ],
            },
          },
          include: {
            customer: true,
            items: true,
          },
        });

        const updatedInventory = await tx.inventory.updateMany({
          where: {
            variantId: variant.id,
            quantity: {
              gte: quantity,
            },
          },
          data: {
            reserved: {
              increment: quantity,
            },
          },
        });

        if (updatedInventory.count !== 1) {
          throw new Error("Failed to reserve inventory for checkout");
        }

        return createdOrder;
      });

      // 4. Generate Razorpay payment order via paymentProvider
      let rzpOrder;
      try {
        rzpOrder = await paymentProvider.createOrder({
          amount: order.total,
          currency: order.currency,
          receipt: order.id,
          notes: {
            commerceosOrderId: order.id,
            merchantId: order.merchantId,
            buyerChannel: "AI_BUYER",
          },
        });
      } catch (gatewayError) {
        // Roll back reserved inventory and cancel pending order
        await prisma.$transaction([
          prisma.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          }),
          prisma.inventory.update({
            where: { variantId: variant.id },
            data: {
              reserved: {
                decrement: quantity,
              },
            },
          }),
        ]);

        throw new Error(
          `Payment gateway failure: ${gatewayError instanceof Error ? gatewayError.message : "Unable to initiate payment"}`
        );
      }

      // 5. Store payment record
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "razorpay",
          providerOrderId: rzpOrder.id,
          amount: order.total,
          currency: order.currency,
          status: "CREATED",
        },
      });

      // 6. Publish event and record audit
      await eventBus.publish("order.created", merchantId, {
        orderId: order.id,
        total: order.total,
        channel: "AI_BUYER",
      });

      await recordAuditEvent({
        merchantId,
        actorType: "AI_AGENT",
        action: "ORDER_CREATED",
        entity: "Order",
        entityId: order.id,
        metadata: {
          channel: "AI_BUYER",
          total: order.total,
          paymentId: payment.id,
        },
      });

      return reply.status(201).send({
        success: true,
        order: {
          id: order.id,
          status: order.status,
          currency: order.currency,
          total: order.total,
        },
        payment: {
          id: payment.id,
          provider: payment.provider,
          providerOrderId: payment.providerOrderId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          razorpayKeyId: env.RAZORPAY_KEY_ID,
        },
      });
    } catch (error) {
      request.log.error(error);
      const message =
        error instanceof Error ? error.message : "Checkout orchestration failed";
      return reply.status(500).send({
        error: message,
      });
    }
  });
}
