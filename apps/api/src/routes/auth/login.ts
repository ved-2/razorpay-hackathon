import { prisma } from "@commerceos/database";
import argon2 from "argon2";
import { z } from "zod";
import { FastifyInstance } from "fastify";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function loginRoute(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request",
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
      include: {
        merchant: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        error: "Invalid email or password",
      });
    }

    const passwordValid = await argon2.verify(
      user.passwordHash,
      password
    );

    if (!passwordValid) {
      return reply.status(401).send({
        error: "Invalid email or password",
      });
    }

    const token = await app.jwt.sign({
      userId: user.id,
      merchantId: user.merchantId,
      role: user.role,
    });

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
      token,
    };
  });
}