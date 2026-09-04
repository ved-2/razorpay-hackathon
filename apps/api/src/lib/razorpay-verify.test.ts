import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyRazorpaySignature } from "./razorpay-verify";
import { env } from "../config/env";

describe("verifyRazorpaySignature", () => {
  it("accepts a valid signature", () => {
    const payload = "test-payload";

    const signature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");

    expect(
      verifyRazorpaySignature(payload, signature)
    ).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(
      verifyRazorpaySignature("test-payload", "invalid-signature")
    ).toBe(false);
  });

  it("rejects a modified payload", () => {
    const payload = "test-payload";

    const signature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");

    expect(
      verifyRazorpaySignature("modified-payload", signature)
    ).toBe(false);
  });
});