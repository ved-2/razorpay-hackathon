import crypto from "node:crypto";
import { VerifyPaymentInput, PaymentResult } from "../types.js";

export function verifyRazorpayPaymentSignature(
  input: VerifyPaymentInput,
  keySecret: string
): PaymentResult {
  const payload = `${input.orderId}|${input.paymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const signatureBuffer = Buffer.from(input.signature, "utf8");

  if (expectedBuffer.length !== signatureBuffer.length) {
    return {
      verified: false,
      orderId: input.orderId,
      paymentId: input.paymentId,
      error: "Signature length mismatch",
    };
  }

  const isValid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

  return {
    verified: isValid,
    orderId: input.orderId,
    paymentId: input.paymentId,
    error: isValid ? undefined : "Invalid signature",
  };
}
