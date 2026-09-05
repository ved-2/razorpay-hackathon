import { FastifyInstance } from "fastify";
import { buyerEvaluateRoute } from "./evaluate";
import { buyerCheckoutRoute } from "./checkout";
import { buyerOrderRoute } from "./order";
import { buyerOptionsRoute } from "./options";

export default async function buyerRoutes(app: FastifyInstance) {
  app.register(buyerEvaluateRoute);
  app.register(buyerCheckoutRoute);
  app.register(buyerOrderRoute);
  app.register(buyerOptionsRoute);
}

