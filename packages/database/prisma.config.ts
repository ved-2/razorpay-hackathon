import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "postgresql://commerceos:commerceos@127.0.0.1:5432/commerceos?schema=public",
  },
});