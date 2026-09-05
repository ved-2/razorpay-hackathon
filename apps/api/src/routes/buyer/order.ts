import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@commerceos/database";
import { env } from "../../config/env";
import { verifyRazorpaySignature } from "../../lib/razorpay-verify";
import { eventBus } from "@commerceos/events";
import { recordAuditEvent } from "../../services/audit";

const verifyBuyerPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function buyerOrderRoute(app: FastifyInstance) {
  // Public route to retrieve order details for buyer checkout
  app.get("/buyer/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return reply.status(404).send({
        error: "Order not found",
      });
    }

    const latestPayment = order.payments[0] ?? null;

    return {
      order,
      payment: latestPayment,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
    };
  });

  // Public route to verify buyer payment with cryptographic signature
  app.post("/buyer/orders/:id/verify", async (request, reply) => {
    const { id: orderId } = request.params as { id: string };
    const body = verifyBuyerPaymentSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: "Invalid payment verification payload",
        details: body.error.flatten(),
      });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body.data;

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payments: true,
        },
      });

      if (!order) {
        return reply.status(404).send({
          error: "Order not found",
        });
      }

      if (order.status === "PAID") {
        const payment = order.payments.find(
          (p) => p.providerOrderId === razorpayOrderId
        );
        return reply.send({
          success: true,
          order,
          payment,
        });
      }

      const payment = order.payments.find(
        (p) => p.provider === "razorpay" && p.providerOrderId === razorpayOrderId
      );

      if (!payment) {
        return reply.status(404).send({
          error: "Payment record not found",
        });
      }

      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const isValid = verifyRazorpaySignature(payload, razorpaySignature);

      if (!isValid) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });

        return reply.status(400).send({
          error: "Invalid Razorpay payment signature",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            providerPaymentId: razorpayPaymentId,
            status: "VERIFIED",
          },
        });

        for (const item of order.items) {
          await tx.inventory.updateMany({
            where: {
              variantId: item.variantId,
              quantity: { gte: item.quantity },
              reserved: { gte: item.quantity },
            },
            data: {
              quantity: { decrement: item.quantity },
              reserved: { decrement: item.quantity },
            },
          });
        }

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: "PAID" },
          include: {
            customer: true,
            items: true,
            payments: true,
          },
        });

        return updatedOrder;
      });

      await eventBus.publish("order.paid", order.merchantId, {
        orderId: order.id,
        total: order.total,
        paymentId: razorpayPaymentId,
        channel: "AI_BUYER",
      });

      await recordAuditEvent({
        merchantId: order.merchantId,
        actorType: "AI_AGENT",
        actorId: "buyer-extension",
        action: "PAYMENT_VERIFIED",
        entity: "Order",
        entityId: order.id,
        metadata: {
          channel: "AI_BUYER",
          razorpayOrderId,
          razorpayPaymentId,
          total: order.total,
        },
      });

      return reply.send({
        success: true,
        order: result,
        payment: result.payments[0],
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        error: err instanceof Error ? err.message : "Payment verification failed",
      });
    }
  });
}
