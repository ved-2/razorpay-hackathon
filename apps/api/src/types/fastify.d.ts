import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      userId: string;
      merchantId: string;
      role: "OWNER" | "ADMIN" | "STAFF";
    };

    user: {
      userId: string;
      merchantId: string;
      role: "OWNER" | "ADMIN" | "STAFF";
    };
  }
}