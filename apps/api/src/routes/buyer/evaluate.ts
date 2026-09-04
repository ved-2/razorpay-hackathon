import { FastifyInstance } from "fastify";
import { z } from "zod";
import { evaluateBuyerDecision } from "@commerceos/ai";

const evaluateBuyerSchema = z.object({
  product: z.object({
    name: z.string().min(1),
    price: z.number().int().positive(),
    currency: z.string().length(3).default("INR"),
    merchantId: z.string().optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    productId: z.string().optional(),
    variantId: z.string().optional(),
  }),
  policy: z.object({
    maxPrice: z.number().int().positive(),
    currency: z.string().length(3).default("INR"),
    requiredKeywords: z.array(z.string()).optional(),
    blockedKeywords: z.array(z.string()).optional(),
    preferredMerchantIds: z.array(z.string()).optional(),
  }),
});

export async function buyerEvaluateRoute(app: FastifyInstance) {
  app.post("/buyer/evaluate", async (request, reply) => {
    const parsed = evaluateBuyerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid buyer evaluation request",
        details: parsed.error.flatten(),
      });
    }

    const { product, policy } = parsed.data;

    const evaluation = evaluateBuyerDecision(product, policy);

    return reply.send({
      evaluation,
      product,
    });
  });
}
