import { FastifyInstance } from "fastify";
import { getRevenueOpportunities } from "@commerceos/domain";
import { authenticate } from "../../plugins/authenticate";

export default async function revenueOpportunitiesRoute(
  app: FastifyInstance
) {
  app.get(
    "/revenue/opportunities",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const opportunities = await getRevenueOpportunities(
        request.user.merchantId
      );

      return reply.send({
        opportunities,
      });
    }
  );
}