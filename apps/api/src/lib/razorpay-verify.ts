import { verifyRazorpayWebhookSignature } from "@commerceos/payments";
import { env } from "../config/env";

export function verifyRazorpaySignature(
  payload: string,
  signature: string,
  secret: string = env.RAZORPAY_KEY_SECRET
): boolean {
  return verifyRazorpayWebhookSignature(payload, signature, secret);
}