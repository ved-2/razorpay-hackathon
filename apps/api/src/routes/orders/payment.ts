import "dotenv/config";
import { FastifyInstance } from "fastify";
import { prisma } from "@commerceos/database";
import { z } from "zod";
import { authenticate } from "../../plugins/authenticate";
import { razorpay } from "../../lib/razorpay";
import { env } from "../../config/env";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export default async function createPaymentRoute(app: FastifyInstance) {
  app.post(
    "/orders/:id/payment",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.status(400).send({
          error: "Invalid order ID",
        });
      }

      const { merchantId } = request.user;
      const { id: orderId } = params.data;

      try {
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            merchantId,
          },
          include: {
            payments: true,
          },
        });

        if (!order) {
          return reply.status(404).send({
            error: "Order not found",
          });
        }

        if (order.status !== "PENDING_PAYMENT") {
          return reply.status(400).send({
            error: "Order is not awaiting payment",
          });
        }

        const existingPayment = order.payments.find(
          (payment) =>
            payment.provider === "razorpay" &&
            payment.status !== "FAILED"
        );

        if (existingPayment?.providerOrderId) {
  return reply.send({
    payment: {
      id: existingPayment.id,
      orderId: existingPayment.orderId,
      provider: existingPayment.provider,
      providerOrderId: existingPayment.providerOrderId,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
      status: existingPayment.status,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
    },
  });
}

        const razorpayOrder = await razorpay.orders.create({
          amount: order.total,
          currency: order.currency,
          receipt: order.id,
          notes: {
            commerceosOrderId: order.id,
            merchantId: order.merchantId,
          },
        });

        const payment = await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: "razorpay",
            providerOrderId: razorpayOrder.id,
            amount: order.total,
            currency: order.currency,
            status: "CREATED",
          },
        });

        return reply.status(201).send({
          payment: {
            id: payment.id,
            orderId: payment.orderId,
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

        return reply.status(502).send({
          error: "Unable to create payment",
        });
      }
    }
  );
}