import { prisma } from "@commerceos/database";
import argon2 from "argon2";
import { z } from "zod";
import { FastifyInstance } from "fastify";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  merchantName: z.string().min(2).max(100),
});

export async function registerRoute(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request",
        details: parsed.error.flatten(),
      });
    }

    const { name, email, password, merchantName } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return reply.status(409).send({
        error: "Email already registered",
      });
    }

    const passwordHash = await argon2.hash(password);

    const merchantSlug =
      merchantName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).slice(2, 8);

    const result = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          name: merchantName,
          slug: merchantSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: "OWNER",
          merchantId: merchant.id,
        },
      });

      return { merchant, user };
    });

    const token = await app.jwt.sign({
      userId: result.user.id,
      merchantId: result.merchant.id,
      role: result.user.role,
    });

    return reply.status(201).send({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      merchant: {
        id: result.merchant.id,
        name: result.merchant.name,
        slug: result.merchant.slug,
      },
      token,
    });
  });
}