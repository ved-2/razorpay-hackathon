import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@commerceos/database";
import { paymentProvider } from "../../lib/razorpay";
import { env } from "../../config/env";
import { eventBus } from "@commerceos/events";
import { recordAuditEvent } from "../../services/audit";

const buyerCheckoutSchema = z.object({
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().positive().default(1),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive().default(1),
      })
    )
    .optional(),
  requireApproval: z.boolean().default(false),
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

    const { variantId, quantity, items, requireApproval, customer, policy } = parsed.data;

    // 1. Normalize cart items
    const cartItems =
      items && items.length > 0
        ? items
        : variantId
        ? [{ variantId, quantity: quantity || 1 }]
        : [];

    if (cartItems.length === 0) {
      return reply.status(400).send({
        error: "At least one product variant must be specified for checkout",
      });
    }

    try {
      // 2. Fetch all requested variants and inventories
      const variantIds = cartItems.map((item) => item.variantId);
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: true,
          inventory: true,
        },
      });

      if (variants.length !== variantIds.length) {
        return reply.status(404).send({
          error: "One or more requested product variants were not found",
        });
      }

      // Check merchant and active status
      const merchantId = variants[0].product.merchantId;
      for (const v of variants) {
        if (v.product.status !== "ACTIVE") {
          return reply.status(400).send({
            error: `Product ${v.product.name} is not active for purchase`,
          });
        }
      }

      // 3. Verify stock availability and prepare item lines
      let orderSubtotal = 0;
      const orderItemsData: Array<{
        variantId: string;
        productName: string;
        variantName: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      for (const cartItem of cartItems) {
        const variant = variants.find((v) => v.id === cartItem.variantId);
        if (!variant) continue;

        const availableStock =
          (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0);

        if (availableStock < cartItem.quantity) {
          return reply.status(400).send({
            error: `Insufficient inventory for ${variant.product.name} (${variant.name}). Available: ${availableStock}, Requested: ${cartItem.quantity}`,
          });
        }

        const lineTotal = variant.price * cartItem.quantity;
        orderSubtotal += lineTotal;

        orderItemsData.push({
          variantId: variant.id,
          productName: variant.product.name,
          variantName: variant.name,
          sku: variant.sku,
          quantity: cartItem.quantity,
          unitPrice: variant.price,
          totalPrice: lineTotal,
        });
      }

      const orderTotal = orderSubtotal;

      // 4. Enforce buyer budget policy over total basket
      if (policy?.maxPrice && orderTotal > policy.maxPrice) {
        return reply.status(400).send({
          error: `Order total ₹${(orderTotal / 100).toFixed(2)} exceeds buyer maximum budget ₹${(
            policy.maxPrice / 100
          ).toFixed(2)}`,
        });
      }

      // 5. Transactionally reserve inventory, create order, and create pending approval if requested
      const { order, approval } = await prisma.$transaction(async (tx) => {
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

        // Create Order with all items
        const createdOrder = await tx.order.create({
          data: {
            merchantId,
            customerId: savedCustomer.id,
            status: "PENDING_PAYMENT",
            currency: variants[0].currency || "INR",
            subtotal: orderSubtotal,
            discount: 0,
            total: orderTotal,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            customer: true,
            items: true,
          },
        });

        // Atomically reserve inventory for each variant
        for (const item of cartItems) {
          const updateResult = await tx.inventory.updateMany({
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

          if (updateResult.count !== 1) {
            throw new Error(`Failed to reserve inventory for variant ${item.variantId}`);
          }
        }

        // Create Human-in-the-Loop Approval record if requested
        let createdApproval = null;
        if (requireApproval) {
          const itemsSummary = orderItemsData
            .map((i) => `${i.productName} (${i.variantName}) x${i.quantity}`)
            .join(", ");

          createdApproval = await tx.approval.create({
            data: {
              merchantId,
              type: "AUTONOMOUS_BUYER_ORDER",
              status: "PENDING",
              title: `Autonomous Purchase: ${orderItemsData.length} items (₹${(
                orderTotal / 100
              ).toLocaleString("en-IN")})`,
              reason: `Autonomous voice buyer requested checkout for: ${itemsSummary}. Total payable: ₹${(
                orderTotal / 100
              ).toLocaleString("en-IN")}. Human-in-the-loop authorization required.`,
              opportunityId: null,
              proposal: {
                action: "AUTONOMOUS_BUYER_ORDER",
                orderId: createdOrder.id,
                total: orderTotal,
                items: orderItemsData,
                customer: {
                  name: customer.name,
                  email: customer.email,
                },
                confidence: 0.98,
                expectedImpact: `Direct revenue generation of ₹${(
                  orderTotal / 100
                ).toLocaleString("en-IN")} across ${orderItemsData.length} items.`,
              },
            },
          });
        }

        return { order: createdOrder, approval: createdApproval };
      });

      // 6. Generate Razorpay payment order
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
            itemCount: String(orderItemsData.length),
            approvalRequired: String(requireApproval),
          },
        });
      } catch (gatewayError) {
        // Roll back reserved inventory and cancel order
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });
          for (const item of cartItems) {
            await tx.inventory.update({
              where: { variantId: item.variantId },
              data: {
                reserved: {
                  decrement: item.quantity,
                },
              },
            });
          }
        });

        throw new Error(
          `Payment gateway failure: ${
            gatewayError instanceof Error ? gatewayError.message : "Unable to initiate payment"
          }`
        );
      }

      // 7. Store payment record
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

      // 8. Publish events and record audit
      await eventBus.publish("order.created", merchantId, {
        orderId: order.id,
        total: order.total,
        channel: "AI_BUYER",
        itemCount: orderItemsData.length,
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
          itemCount: orderItemsData.length,
          paymentId: payment.id,
          approvalId: approval?.id || null,
        },
      });

      if (approval) {
        await recordAuditEvent({
          merchantId,
          actorType: "AI_AGENT",
          action: "APPROVAL_CREATED",
          entity: "Approval",
          entityId: approval.id,
          metadata: {
            type: "AUTONOMOUS_BUYER_ORDER",
            orderId: order.id,
            total: order.total,
          },
        });
      }

      return reply.status(201).send({
        success: true,
        order: {
          id: order.id,
          status: order.status,
          currency: order.currency,
          total: order.total,
          itemCount: orderItemsData.length,
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
        approval: approval
          ? {
              id: approval.id,
              status: approval.status,
              title: approval.title,
            }
          : null,
        approvalRequired: Boolean(approval),
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
