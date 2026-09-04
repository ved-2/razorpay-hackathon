import Fastify from "fastify";
import { prisma } from "@commerceos/database";
import { env } from "./config/env";
import authPlugin from "./plugins/auth";
import { registerRoute } from "./routes/auth/register";
import { loginRoute } from "./routes/auth/login";
import { meRoute } from "./routes/auth/me";
import { createProductRoute } from "./routes/products/create";
import { listProductsRoute } from "./routes/products/list";
import { getProductRoute } from "./routes/products/get";
import { updateProductRoute } from "./routes/products/update";
import { deleteProductRoute } from "./routes/products/delete";
import { createVariantRoute } from "./routes/variants/create";
import { listVariantsRoute } from "./routes/variants/list";
import { updateVariantRoute } from "./routes/variants/update";
import { deleteVariantRoute } from "./routes/variants/delete";
import { updateInventoryRoute } from "./routes/variants/inventory";
import createOrderRoute from "./routes/orders/create";
import cancelOrderRoute from "./routes/orders/cancel";
import createPaymentRoute from "./routes/orders/payment";
import verifyPaymentRoute from "./routes/orders/verify-payment";
import cors from "@fastify/cors";
import rawBody from "fastify-raw-body";
import razorpayWebhookRoute from "./routes/webhooks/razorpay";
import revenueOverviewRoute from "./routes/revenue/overview";
import revenueOpportunitiesRoute from "./routes/revenue/opportunities";
import revenueAnalyticsRoute from "./routes/revenue/analytics";
import aiProposeRoute from "./routes/ai/propose";
import policyEvaluateRoute from "./routes/policy/evaluate";
import approvalsRoutes from "./routes/approvals";
import auditListRoute from "./routes/audit/list";
import buyerRoutes from "./routes/buyer";
import { initializeBackgroundWorkers } from "./services/workers";

export function buildApp() {
  initializeBackgroundWorkers();

  const app = Fastify({
    logger: false,
  });
  app.register(cors, {
  origin: "http://localhost:3000",
});
  app.register(rawBody, {
  field: "rawBody",
  global: false,
  encoding: "utf8",
  runFirst: true,
});

  


  app.register(authPlugin);

  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      service: "commerceos-api",
      database: "connected",
    };
  });

  app.register(registerRoute);
  app.register(loginRoute);
  app.register(meRoute);

  app.register(createProductRoute);
  app.register(listProductsRoute);
  app.register(getProductRoute);
  app.register(updateProductRoute);
  app.register(deleteProductRoute);

  app.register(createVariantRoute);
  app.register(listVariantsRoute);
  app.register(updateVariantRoute);
  app.register(deleteVariantRoute);
  app.register(updateInventoryRoute);

  app.register(createOrderRoute);
  app.register(cancelOrderRoute);

  app.register(createPaymentRoute);
  app.register(verifyPaymentRoute);

  app.register(razorpayWebhookRoute);

  app.register(revenueOverviewRoute);
  app.register(revenueOpportunitiesRoute);
  app.register(revenueAnalyticsRoute);
  app.register(aiProposeRoute);
  app.register(policyEvaluateRoute);
  app.register(approvalsRoutes);
  app.register(auditListRoute);
  app.register(buyerRoutes);


  return app;
}