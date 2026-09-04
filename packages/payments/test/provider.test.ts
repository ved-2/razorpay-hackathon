import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  RazorpayPaymentProvider,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../src/index.js";

describe("Payment Provider Abstraction", () => {
  const secret = "test_razorpay_secret_key_12345";
  const webhookSecret = "test_webhook_secret_67890";

  it("initializes RazorpayPaymentProvider with proper configuration", () => {
    const provider = new RazorpayPaymentProvider({
      keyId: "rzp_test_123",
      keySecret: secret,
      webhookSecret,
    });

    expect(provider.name).toBe("razorpay");
  });

  describe("verifyRazorpayPaymentSignature", () => {
    it("validates a correct payment signature", () => {
      const orderId = "order_abc123";
      const paymentId = "pay_def456";
      const validSignature = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const result = verifyRazorpayPaymentSignature(
        {
          orderId,
          paymentId,
          signature: validSignature,
        },
        secret
      );

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects an invalid payment signature", () => {
      const orderId = "order_abc123";
      const paymentId = "pay_def456";
      const badSignature = "a".repeat(64);

      const result = verifyRazorpayPaymentSignature(
        {
          orderId,
          paymentId,
          signature: badSignature,
        },
        secret
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("rejects when signature length does not match", () => {
      const result = verifyRazorpayPaymentSignature(
        {
          orderId: "order_1",
          paymentId: "pay_1",
          signature: "too_short",
        },
        secret
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Signature length mismatch");
    });
  });

  describe("verifyRazorpayWebhookSignature", () => {
    it("verifies valid webhook signature", () => {
      const payload = JSON.stringify({ event: "payment.captured", id: "evt_1" });
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      const isValid = verifyRazorpayWebhookSignature(payload, signature, webhookSecret);
      expect(isValid).toBe(true);
    });

    it("rejects invalid webhook signature", () => {
      const payload = JSON.stringify({ event: "payment.captured", id: "evt_1" });
      const badSignature = "b".repeat(64);

      const isValid = verifyRazorpayWebhookSignature(payload, badSignature, webhookSecret);
      expect(isValid).toBe(false);
    });
  });

  describe("Provider delegate methods", () => {
    it("verifyPayment method on provider instance works", async () => {
      const provider = new RazorpayPaymentProvider({
        keyId: "rzp_test_123",
        keySecret: secret,
        webhookSecret,
      });

      const orderId = "order_inst_1";
      const paymentId = "pay_inst_1";
      const validSignature = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const result = await provider.verifyPayment({
        orderId,
        paymentId,
        signature: validSignature,
      });

      expect(result.verified).toBe(true);
    });

    it("verifyWebhook method on provider instance works", () => {
      const provider = new RazorpayPaymentProvider({
        keyId: "rzp_test_123",
        keySecret: secret,
        webhookSecret,
      });

      const payload = JSON.stringify({ event: "order.paid" });
      const validSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      expect(provider.verifyWebhook(payload, validSignature)).toBe(true);
    });

    it("createOrder delegates to underlying razorpay client", async () => {
      const provider = new RazorpayPaymentProvider({
        keyId: "rzp_test_123",
        keySecret: secret,
        webhookSecret,
      });

      // Mock the internal client orders.create
      const mockCreate = vi.fn().mockResolvedValue({
        id: "order_mocked_123",
        amount: 299900,
        currency: "INR",
        status: "created",
        receipt: "rcpt_1",
      });
      (provider as any).client = {
        orders: {
          create: mockCreate,
        },
      };

      const result = await provider.createOrder({
        amount: 299900,
        currency: "INR",
        receipt: "rcpt_1",
        notes: { test: "true" },
      });

      expect(result.id).toBe("order_mocked_123");
      expect(result.amount).toBe(299900);
      expect(result.currency).toBe("INR");
      expect(mockCreate).toHaveBeenCalledWith({
        amount: 299900,
        currency: "INR",
        receipt: "rcpt_1",
        notes: { test: "true" },
      });
    });
  });
});
