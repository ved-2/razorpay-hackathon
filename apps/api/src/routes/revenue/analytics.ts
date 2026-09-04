import { FastifyInstance } from "fastify";
import { getRevenueAnalytics } from "@commerceos/domain";
import { authenticate } from "../../plugins/authenticate";

export default async function revenueAnalyticsRoute(app: FastifyInstance) {
  app.get(
    "/revenue/analytics",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const analytics = await getRevenueAnalytics(
        request.user.merchantId
      );

      return reply.send({
        analytics,
      });
    }
  );
}
