import { FastifyInstance } from "fastify";
import { prisma } from "@commerceos/database";
import { z } from "zod";
import { authenticate } from "../../plugins/authenticate";
import { verifyRazorpaySignature } from "../../lib/razorpay-verify";
import { eventBus } from "@commerceos/events";
import { recordAuditEvent } from "../../services/audit";

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export default async function verifyPaymentRoute(app: FastifyInstance) {
  app.post(
    "/orders/:id/payment/verify",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().min(1) })
        .safeParse(request.params);

      const body = verifyPaymentSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        return reply.status(400).send({
          error: "Invalid payment verification request",
        });
      }

      const { merchantId } = request.user;
      const { id: orderId } = params.data;
      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      } = body.data;

      try {
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            merchantId,
          },
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
            (item) =>
              item.provider === "razorpay" &&
              item.providerOrderId === razorpayOrderId
          );
          return reply.send({
            order,
            payment,
          });
        }

        if (order.status === "CANCELLED") {
          return reply.status(400).send({
            error: "Cannot verify payment for a cancelled order",
          });
        }

        const payment = order.payments.find(
          (item) =>
            item.provider === "razorpay" &&
            item.providerOrderId === razorpayOrderId
        );

        if (!payment) {
          return reply.status(404).send({
            error: "Payment not found",
          });
        }

        if (payment.status === "VERIFIED") {
          return reply.send({
            order,
            payment,
          });
        }

        const payload = `${razorpayOrderId}|${razorpayPaymentId}`;

        const valid = verifyRazorpaySignature(
          payload,
          razorpaySignature
        );

        if (!valid) {
          await prisma.payment.update({
            where: {
              id: payment.id,
            },
            data: {
              status: "FAILED",
            },
          });

          return reply.status(400).send({
            error: "Invalid payment signature",
          });
        }

        const result = await prisma.$transaction(async (tx) => {
          const updateResult = await tx.payment.updateMany({
            where: {
              id: payment.id,
              status: {
                not: "VERIFIED",
              },
            },
            data: {
              providerPaymentId: razorpayPaymentId,
              status: "VERIFIED",
            },
          });

          if (updateResult.count === 0) {
            const currentOrder = await tx.order.findUnique({
              where: { id: order.id },
              include: {
                customer: true,
                items: true,
                payments: true,
              },
            });
            const currentPayment = await tx.payment.findUnique({
              where: { id: payment.id },
            });
            return {
              order: currentOrder,
              payment: currentPayment,
            };
          }

          for (const item of order.items) {
            const updatedInventory = await tx.inventory.updateMany({
              where: {
                variantId: item.variantId,
                quantity: {
                  gte: item.quantity,
                },
                reserved: {
                  gte: item.quantity,
                },
              },
              data: {
                quantity: {
                  decrement: item.quantity,
                },
                reserved: {
                  decrement: item.quantity,
                },
              },
            });

            if (updatedInventory.count !== 1) {
              throw new Error(
                `Unable to settle inventory for variant ${item.variantId}`
              );
            }
          }

          const updatedOrder = await tx.order.update({
            where: {
              id: order.id,
            },
            data: {
              status: "PAID",
            },
            include: {
              customer: true,
              items: true,
              payments: true,
            },
          });

          const verifiedPayment = await tx.payment.findUnique({
            where: { id: payment.id },
          });

          return {
            order: updatedOrder,
            payment: verifiedPayment,
          };
        });

        if (result.order) {
          await eventBus.publish("order.paid", merchantId, {
            orderId: result.order.id,
            total: result.order.total,
            paymentId: result.payment?.id,
          });

          await recordAuditEvent({
            merchantId,
            actorType: "USER",
            actorId: request.user.userId,
            action: "PAYMENT_VERIFIED",
            entity: "Order",
            entityId: result.order.id,
            metadata: {
              paymentId: result.payment?.id,
              total: result.order.total,
            },
          });
        }

        return reply.send(result);
      } catch (error) {
        request.log.error(error);

        const message =
          error instanceof Error
            ? error.message
            : "Unable to verify payment";

        return reply.status(400).send({
          error: message,
        });
      }
    }
  );
}