import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getRevenueOpportunities } from "@commerceos/domain";
import { runOpportunityAgent } from "@commerceos/ai";
import { authenticate } from "../../plugins/authenticate";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export default async function aiProposeRoute(app: FastifyInstance) {
  app.post(
    "/ai/opportunities/:id/propose",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.status(400).send({
          error: "Invalid opportunity ID",
        });
      }

      const { merchantId } = request.user;
      const { id: opportunityId } = params.data;

      const opportunities = await getRevenueOpportunities(merchantId);
      const opportunity = opportunities.find((opp) => opp.id === opportunityId);

      if (!opportunity) {
        return reply.status(404).send({
          error: "Opportunity not found",
        });
      }

      try {
        const result = await runOpportunityAgent(opportunity, merchantId);

        if (!result.proposal) {
          return reply.status(500).send({
            error: "Failed to generate valid proposal",
            details: result.errors,
          });
        }

        return reply.send({
          opportunity,
          proposal: result.proposal,
          context: result.context,
        });
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({
          error: "AI reasoning pipeline failed",
        });
      }
    }
  );
}
