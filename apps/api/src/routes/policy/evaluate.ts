import { FastifyInstance } from "fastify";
import { z } from "zod";
import { evaluateProposalPolicy } from "@commerceos/policy";
import { aiProposalSchema } from "@commerceos/ai";
import { authenticate } from "../../plugins/authenticate";

const evaluatePolicyBodySchema = z.object({
  proposal: aiProposalSchema,
  policyOverrides: z
    .object({
      maxDiscountPercent: z.number().min(0).max(100).optional(),
      maxRestockQuantity: z.number().int().positive().optional(),
      maxOrderValue: z.number().int().positive().optional(),
      minConfidence: z.number().min(0).max(1).optional(),
      approvalRequired: z.boolean().optional(),
    })
    .optional(),
});

export default async function policyEvaluateRoute(app: FastifyInstance) {
  app.post(
    "/policy/evaluate",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = evaluatePolicyBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid policy evaluation request",
          details: parsed.error.flatten(),
        });
      }

      const { proposal, policyOverrides } = parsed.data;

      const evaluation = evaluateProposalPolicy(proposal, policyOverrides);

      return reply.send({
        evaluation,
      });
    }
  );
}
