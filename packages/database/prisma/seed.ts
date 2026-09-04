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
  console.log("🌱 Starting CommerceOS comprehensive demo seed...");

  const passwordHash = await argon2.hash("password123");

  // 1. Demo Merchant
  const merchant = await prisma.merchant.upsert({
    where: { slug: "apex-athletics" },
    update: { name: "Apex Athletics" },
    create: {
      id: "demo-merchant-apex",
      name: "Apex Athletics",
      slug: "apex-athletics",
    },
  });

  // 2. Demo Users
  const demoOwner = await prisma.user.upsert({
    where: { email: "demo@commerceos.io" },
    update: { passwordHash, merchantId: merchant.id },
    create: {
      email: "demo@commerceos.io",
      name: "Aarav Sharma",
      passwordHash,
      role: "OWNER",
      merchantId: merchant.id,
    },
  });

  const demoAgentController = await prisma.user.upsert({
    where: { email: "agent-controller@commerceos.io" },
    update: { passwordHash, merchantId: merchant.id },
    create: {
      email: "agent-controller@commerceos.io",
      name: "Agent Operations Controller",
      passwordHash,
      role: "ADMIN",
      merchantId: merchant.id,
    },
  });

  console.log(`✅ Merchant: ${merchant.name} (${merchant.slug})`);
  console.log(`✅ Users: ${demoOwner.email} (OWNER), ${demoAgentController.email} (ADMIN)`);

  // 3. Products
  const runnerProduct = await prisma.product.upsert({
    where: { id: "prod_cloudstrider_runner" },
    update: { merchantId: merchant.id },
    create: {
      id: "prod_cloudstrider_runner",
      merchantId: merchant.id,
      name: "CloudStrider Carbon Runner",
      description: "Next-generation ultralight carbon-plated marathon road racing shoe.",
      status: "ACTIVE",
    },
  });

  const socksProduct = await prisma.product.upsert({
    where: { id: "prod_aerodry_socks" },
    update: { merchantId: merchant.id },
    create: {
      id: "prod_aerodry_socks",
      merchantId: merchant.id,
      name: "AeroDry Performance Socks (3-Pack)",
      description: "Targeted compression arch support with blister-free moisture-wicking weave.",
      status: "ACTIVE",
    },
  });

  const bottleProduct = await prisma.product.upsert({
    where: { id: "prod_hydrovelocity_bottle" },
    update: { merchantId: merchant.id },
    create: {
      id: "prod_hydrovelocity_bottle",
      merchantId: merchant.id,
      name: "HydroVelocity Insulated Bottle 750ml",
      description: "Double-wall vacuum insulated stainless steel sports hydration flask.",
      status: "ACTIVE",
    },
  });

  const tightsProduct = await prisma.product.upsert({
    where: { id: "prod_recovery_tights" },
    update: { merchantId: merchant.id },
    create: {
      id: "prod_recovery_tights",
      merchantId: merchant.id,
      name: "Thermal Recovery Compression Tights",
      description: "Post-workout circulation support tights engineered for accelerated muscle recovery.",
      status: "ACTIVE",
    },
  });

  console.log("✅ Catalog: 4 distinct products created across categories.");

  // 4. Variants & Inventory Calibration
  // Variant 1A: Stealth Black UK 9 -> LOW STOCK (quantity = 2, reserved = 0)
  const varStealthBlack = await prisma.productVariant.upsert({
    where: { sku: "CS-BLK-09" },
    update: { productId: runnerProduct.id, price: 349900 },
    create: {
      id: "var_cs_blk_09",
      productId: runnerProduct.id,
      name: "Stealth Black / UK 9",
      sku: "CS-BLK-09",
      price: 349900,
      currency: "INR",
    },
  });

  await prisma.inventory.upsert({
    where: { variantId: varStealthBlack.id },
    update: { quantity: 2, reserved: 0 },
    create: { variantId: varStealthBlack.id, quantity: 2, reserved: 0 },
  });

  // Variant 1B: Volt Orange UK 10 -> HIGH VELOCITY (quantity = 40)
  const varVoltOrange = await prisma.productVariant.upsert({
    where: { sku: "CS-ORG-10" },
    update: { productId: runnerProduct.id, price: 349900 },
    create: {
      id: "var_cs_org_10",
      productId: runnerProduct.id,
      name: "Volt Orange / UK 10",
      sku: "CS-ORG-10",
      price: 349900,
      currency: "INR",
    },
  });

  await prisma.inventory.upsert({
    where: { variantId: varVoltOrange.id },
    update: { quantity: 40, reserved: 0 },
    create: { variantId: varVoltOrange.id, quantity: 40, reserved: 0 },
  });

  // Variant 2: Socks (quantity = 120)
  const varSocks = await prisma.productVariant.upsert({
    where: { sku: "AD-SOCK-CHR" },
    update: { productId: socksProduct.id, price: 49900 },
    create: {
      id: "var_ad_sock_chr",
      productId: socksProduct.id,
      name: "Charcoal & White / Free Size",
      sku: "AD-SOCK-CHR",
      price: 49900,
      currency: "INR",
    },
  });

  await prisma.inventory.upsert({
    where: { variantId: varSocks.id },
    update: { quantity: 120, reserved: 0 },
    create: { variantId: varSocks.id, quantity: 120, reserved: 0 },
  });

  // Variant 3: Bottle (quantity = 50)
  const varBottle = await prisma.productVariant.upsert({
    where: { sku: "HV-BOT-MATTE" },
    update: { productId: bottleProduct.id, price: 129900 },
    create: {
      id: "var_hv_bot_matte",
      productId: bottleProduct.id,
      name: "Matte Obsidian",
      sku: "HV-BOT-MATTE",
      price: 129900,
      currency: "INR",
    },
  });

  await prisma.inventory.upsert({
    where: { variantId: varBottle.id },
    update: { quantity: 50, reserved: 0 },
    create: { variantId: varBottle.id, quantity: 50, reserved: 0 },
  });

  // Variant 4: Recovery Tights (quantity = 25, 0 sales -> LOW_CONVERSION)
  const varTights = await prisma.productVariant.upsert({
    where: { sku: "RC-TGT-NAVY-L" },
    update: { productId: tightsProduct.id, price: 249900 },
    create: {
      id: "var_rc_tgt_navy_l",
      productId: tightsProduct.id,
      name: "Midnight Navy / Large",
      sku: "RC-TGT-NAVY-L",
      price: 249900,
      currency: "INR",
    },
  });

  await prisma.inventory.upsert({
    where: { variantId: varTights.id },
    update: { quantity: 25, reserved: 0 },
    create: { variantId: varTights.id, quantity: 25, reserved: 0 },
  });

  console.log("✅ Inventory calibrated for all 4 opportunity archetypes.");

  // 5. Customers
  const customerRohan = await prisma.customer.upsert({
    where: { id: "cust_rohan_verma" },
    update: {},
    create: {
      id: "cust_rohan_verma",
      merchantId: merchant.id,
      name: "Rohan Verma",
      email: "rohan.verma@example.com",
      phone: "+919876543210",
    },
  });

  const customerPriya = await prisma.customer.upsert({
    where: { id: "cust_priya_patel" },
    update: {},
    create: {
      id: "cust_priya_patel",
      merchantId: merchant.id,
      name: "Priya Patel",
      email: "priya.patel@example.com",
      phone: "+919876543211",
    },
  });

  const customerVikram = await prisma.customer.upsert({
    where: { id: "cust_vikram_mehta" },
    update: {},
    create: {
      id: "cust_vikram_mehta",
      merchantId: merchant.id,
      name: "Vikram Mehta",
      email: "vikram.mehta@example.com",
      phone: "+919876543212",
    },
  });

  const customerAgent = await prisma.customer.upsert({
    where: { id: "cust_agent_alpha" },
    update: {},
    create: {
      id: "cust_agent_alpha",
      merchantId: merchant.id,
      name: "Autonomous Buyer Agent Alpha",
      email: "buyer-agent-alpha@commerceos.ai",
      phone: "+919999911111",
    },
  });

  // 6. Historical Orders & Payments
  // Clean past demo orders for idempotency
  await prisma.order.deleteMany({
    where: { merchantId: merchant.id },
  });

  // Order 1: Rohan buys 2x Volt Orange
  const order1 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      customerId: customerRohan.id,
      status: "PAID",
      currency: "INR",
      subtotal: 699800,
      total: 699800,
      items: {
        create: [
          {
            variantId: varVoltOrange.id,
            productName: runnerProduct.name,
            variantName: varVoltOrange.name,
            sku: varVoltOrange.sku,
            quantity: 2,
            unitPrice: varVoltOrange.price,
            totalPrice: 699800,
          },
        ],
      },
      payments: {
        create: [
          {
            provider: "razorpay",
            providerOrderId: "order_rzp_demo_1",
            providerPaymentId: "pay_rzp_demo_1",
            amount: 699800,
            currency: "INR",
            status: "VERIFIED",
          },
        ],
      },
    },
  });

  // Order 2: Priya buys 2x Volt Orange + 2x AeroDry Socks (Co-purchase 1)
  const order2 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      customerId: customerPriya.id,
      status: "PAID",
      currency: "INR",
      subtotal: 799600,
      total: 799600,
      items: {
        create: [
          {
            variantId: varVoltOrange.id,
            productName: runnerProduct.name,
            variantName: varVoltOrange.name,
            sku: varVoltOrange.sku,
            quantity: 2,
            unitPrice: varVoltOrange.price,
            totalPrice: 699800,
          },
          {
            variantId: varSocks.id,
            productName: socksProduct.name,
            variantName: varSocks.name,
            sku: varSocks.sku,
            quantity: 2,
            unitPrice: varSocks.price,
            totalPrice: 99800,
          },
        ],
      },
      payments: {
        create: [
          {
            provider: "razorpay",
            providerOrderId: "order_rzp_demo_2",
            providerPaymentId: "pay_rzp_demo_2",
            amount: 799600,
            currency: "INR",
            status: "VERIFIED",
          },
        ],
      },
    },
  });

  // Order 3: Vikram buys 1x Stealth Black + 1x AeroDry Socks (Co-purchase 2 & Low stock sales trigger)
  const order3 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      customerId: customerVikram.id,
      status: "PAID",
      currency: "INR",
      subtotal: 399800,
      total: 399800,
      items: {
        create: [
          {
            variantId: varStealthBlack.id,
            productName: runnerProduct.name,
            variantName: varStealthBlack.name,
            sku: varStealthBlack.sku,
            quantity: 1,
            unitPrice: varStealthBlack.price,
            totalPrice: 349900,
          },
          {
            variantId: varSocks.id,
            productName: socksProduct.name,
            variantName: varSocks.name,
            sku: varSocks.sku,
            quantity: 1,
            unitPrice: varSocks.price,
            totalPrice: 49900,
          },
        ],
      },
      payments: {
        create: [
          {
            provider: "razorpay",
            providerOrderId: "order_rzp_demo_3",
            providerPaymentId: "pay_rzp_demo_3",
            amount: 399800,
            currency: "INR",
            status: "VERIFIED",
          },
        ],
      },
    },
  });

  // Order 4: Agent Alpha buys 2x Volt Orange + 1x HydroVelocity Bottle
  const order4 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      customerId: customerAgent.id,
      status: "PAID",
      currency: "INR",
      subtotal: 829700,
      total: 829700,
      items: {
        create: [
          {
            variantId: varVoltOrange.id,
            productName: runnerProduct.name,
            variantName: varVoltOrange.name,
            sku: varVoltOrange.sku,
            quantity: 2,
            unitPrice: varVoltOrange.price,
            totalPrice: 699800,
          },
          {
            variantId: varBottle.id,
            productName: bottleProduct.name,
            variantName: varBottle.name,
            sku: varBottle.sku,
            quantity: 1,
            unitPrice: varBottle.price,
            totalPrice: 129900,
          },
        ],
      },
      payments: {
        create: [
          {
            provider: "razorpay",
            providerOrderId: "order_rzp_demo_4",
            providerPaymentId: "pay_rzp_demo_4",
            amount: 829700,
            currency: "INR",
            status: "VERIFIED",
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded 4 paid transactions totaling ₹${((699800 + 799600 + 399800 + 829700) / 100).toLocaleString()}`);

  // 7. Approvals (Pending & Historical)
  await prisma.approval.deleteMany({
    where: { merchantId: merchant.id },
  });

  // Pending Approval ready for Merchant Action
  const pendingApproval = await prisma.approval.create({
    data: {
      id: "demo-approval-bundle",
      merchantId: merchant.id,
      type: "BUNDLE",
      status: "PENDING",
      title: "Commercial Bundle: CloudStrider Runners + AeroDry Socks",
      reason: "Identified high co-purchase correlation across 2 recent customer orders. Bundling with a 10% discount is projected to lift AOV by 18%.",
      opportunityId: "opp_cross_sell_bundle",
      proposal: {
        action: "BUNDLE",
        title: "Commercial Bundle: CloudStrider Runners + AeroDry Socks",
        reason: "Identified high co-purchase correlation across 2 recent customer orders. Bundling with a 10% discount is projected to lift AOV by 18%.",
        discountPercent: 10,
        bundleProductIds: [runnerProduct.id, socksProduct.id],
        expectedImpact: "Increase Average Order Value (AOV) by approximately 18%.",
        confidence: 0.92,
      },
    },
  });

  // Historical Approved/Executed Restock
  const executedApproval = await prisma.approval.create({
    data: {
      id: "demo-approval-restock",
      merchantId: merchant.id,
      type: "RESTOCK",
      status: "APPROVED",
      title: "Restock CloudStrider Carbon Runner (Volt Orange / UK 10)",
      reason: "Item velocity sustained high run-rate.",
      executedAt: new Date(Date.now() - 3600000 * 24),
      executionResult: {
        action: "RESTOCK",
        success: true,
        details: {
          variantId: varVoltOrange.id,
          sku: varVoltOrange.sku,
          addedQuantity: 20,
          newQuantity: 40,
        },
      },
      proposal: {
        action: "RESTOCK",
        title: "Restock CloudStrider Carbon Runner (Volt Orange / UK 10)",
        reason: "Item velocity sustained high run-rate.",
        quantity: 20,
        targetVariantId: varVoltOrange.id,
        confidence: 0.95,
      },
    },
  });

  console.log(`✅ Seeded Approvals: 1 PENDING (${pendingApproval.title}), 1 APPROVED.`);

  // 8. Audit Trail Records
  await prisma.auditEvent.deleteMany({
    where: { merchantId: merchant.id },
  });

  await prisma.auditEvent.createMany({
    data: [
      {
        merchantId: merchant.id,
        actorType: "USER",
        actorId: demoOwner.id,
        action: "MERCHANT_CREATED",
        entity: "Merchant",
        entityId: merchant.id,
        metadata: { name: merchant.name, slug: merchant.slug },
      },
      {
        merchantId: merchant.id,
        actorType: "SYSTEM",
        action: "POLICY_CHECKED",
        entity: "AIProposal",
        metadata: { action: "BUNDLE", allowed: true, violations: [] },
      },
      {
        merchantId: merchant.id,
        actorType: "AI_AGENT",
        action: "APPROVAL_CREATED",
        entity: "Approval",
        entityId: pendingApproval.id,
        metadata: { type: pendingApproval.type, title: pendingApproval.title },
      },
      {
        merchantId: merchant.id,
        actorType: "SYSTEM",
        action: "ACTION_EXECUTED",
        entity: "ActionExecutor",
        entityId: executedApproval.id,
        metadata: { action: "RESTOCK", quantityAdded: 20 },
      },
      {
        merchantId: merchant.id,
        actorType: "AI_AGENT",
        action: "ORDER_CREATED",
        entity: "Order",
        entityId: order4.id,
        metadata: { channel: "AI_BUYER", total: order4.total },
      },
      {
        merchantId: merchant.id,
        actorType: "USER",
        action: "PAYMENT_VERIFIED",
        entity: "Order",
        entityId: order4.id,
        metadata: { status: "VERIFIED", total: order4.total },
      },
    ],
  });

  console.log("✅ Seeded complete immutable Audit Trail entries.");
  console.log("🚀 CommerceOS Demo Seed complete!");
  console.log("\n================ DEMO CREDENTIALS ================");
  console.log("URL:      http://localhost:3000");
  console.log("Email:    demo@commerceos.io");
  console.log("Password: password123");
  console.log("Store:    Apex Athletics (slug: apex-athletics)");
  console.log("==================================================\n");
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });