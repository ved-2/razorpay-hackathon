import Fastify from "fastify";
import { prisma } from "@commerceos/database";

const app = Fastify({
  logger: true,
});

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
      port: 4000,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();