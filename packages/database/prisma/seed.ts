import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const passwordHash = await argon2.hash("password123");

  const merchant = await prisma.merchant.upsert({
    where: {
      slug: "demo-store",
    },
    update: {},
    create: {
      name: "Demo Store",
      slug: "demo-store",
    },
  });

  const user = await prisma.user.upsert({
    where: {
      email: "demo@commerceos.local",
    },
    update: {},
    create: {
      name: "Demo Merchant",
      email: "demo@commerceos.local",
      passwordHash,
      role: "OWNER",
      merchantId: merchant.id,
    },
  });

  const shoes = await prisma.product.upsert({
    where: {
      id: "demo-running-shoes",
    },
    update: {},
    create: {
      id: "demo-running-shoes",
      name: "Running Shoes",
      description: "Lightweight running shoes",
      merchantId: merchant.id,
    },
  });

  const socks = await prisma.product.upsert({
    where: {
      id: "demo-cotton-socks",
    },
    update: {},
    create: {
      id: "demo-cotton-socks",
      name: "Cotton Socks",
      description: "Comfortable everyday socks",
      merchantId: merchant.id,
    },
  });

  const shoeVariant = await prisma.productVariant.upsert({
    where: {
      sku: "SHOE-BLK-9",
    },
    update: {},
    create: {
      productId: shoes.id,
      name: "Black / Size 9",
      sku: "SHOE-BLK-9",
      price: 299900,
      currency: "INR",
    },
  });

  await prisma.inventory.upsert({
    where: {
      variantId: shoeVariant.id,
    },
    update: {
      quantity: 10,
    },
    create: {
      variantId: shoeVariant.id,
      quantity: 10,
    },
  });

  const shoeVariant2 = await prisma.productVariant.upsert({
    where: {
      sku: "SHOE-WHT-9",
    },
    update: {},
    create: {
      productId: shoes.id,
      name: "White / Size 9",
      sku: "SHOE-WHT-9",
      price: 299900,
      currency: "INR",
    },
  });

  await prisma.inventory.upsert({
    where: {
      variantId: shoeVariant2.id,
    },
    update: {
      quantity: 5,
    },
    create: {
      variantId: shoeVariant2.id,
      quantity: 5,
    },
  });

  const sockVariant = await prisma.productVariant.upsert({
    where: {
      sku: "SOCK-BLK-FREE",
    },
    update: {},
    create: {
      productId: socks.id,
      name: "Black / Free Size",
      sku: "SOCK-BLK-FREE",
      price: 39900,
      currency: "INR",
    },
  });

  await prisma.inventory.upsert({
    where: {
      variantId: sockVariant.id,
    },
    update: {
      quantity: 30,
    },
    create: {
      variantId: sockVariant.id,
      quantity: 30,
    },
  });

  console.log("Demo merchant:", merchant.slug);
  console.log("Demo user:", user.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });