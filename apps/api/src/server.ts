import Fastify from "fastify";
import { prisma } from "@commerceos/database";
import { env } from "./config/env";
import authPlugin from "./plugins/auth";
import { registerRoute } from "./routes/auth/register";
import { loginRoute } from "./routes/auth/login";
import { meRoute } from "./routes/auth/me";


const app = Fastify({
  logger: true,
});
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

app.register(createVariantRoute);
app.register(listVariantsRoute);
app.register(updateVariantRoute);
app.register(deleteVariantRoute);
app.register(updateInventoryRoute);

app.register(authPlugin);
app.register(registerRoute);
app.register(loginRoute);
app.register(meRoute);
app.register(createProductRoute);
app.register(listProductsRoute);
app.register(getProductRoute);
app.register(updateProductRoute);
app.register(deleteProductRoute);


app.get("/health", async () => {
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: "ok",
    service: "commerceos-api",
    database: "connected",
  };
});

const start = async () => {
  try {
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();