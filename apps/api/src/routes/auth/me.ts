import { prisma } from "@commerceos/database";
import { FastifyInstance } from "fastify";
import { authenticate } from "../../plugins/authenticate";

export async function meRoute(app: FastifyInstance) {
  app.get(
    "/auth/me",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { userId } = request.user as {
        userId: string;
        merchantId: string;
        role: string;
      };

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          merchant: true,
        },
      });

      if (!user) {
        return reply.status(401).send({
          error: "User not found",
        });
      }

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        merchant: {
          id: user.merchant.id,
          name: user.merchant.name,
          slug: user.merchant.slug,
        },
      };
    }
  );
}