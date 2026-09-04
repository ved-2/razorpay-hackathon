import { FastifyInstance } from "fastify";
import { getRevenueOverview } from "@commerceos/domain";
import { authenticate } from "../../plugins/authenticate";

export default async function revenueOverviewRoute(
  app: FastifyInstance
) {
  app.get(
    "/revenue/overview",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const overview = await getRevenueOverview(
        request.user.merchantId
      );

      return reply.send({
        overview,
      });
    }
  );
}