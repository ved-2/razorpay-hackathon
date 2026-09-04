import { FastifyInstance } from "fastify";
import { buyerEvaluateRoute } from "./evaluate";
import { buyerCheckoutRoute } from "./checkout";

export default async function buyerRoutes(app: FastifyInstance) {
  app.register(buyerEvaluateRoute);
  app.register(buyerCheckoutRoute);
}
