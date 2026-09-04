import { RazorpayPaymentProvider, createRazorpayClient } from "@commerceos/payments";
import { env } from "../config/env";

export const paymentProvider = new RazorpayPaymentProvider({
  keyId: env.RAZORPAY_KEY_ID,
  keySecret: env.RAZORPAY_KEY_SECRET,
  webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
});

export const razorpay = createRazorpayClient({
  keyId: env.RAZORPAY_KEY_ID,
  keySecret: env.RAZORPAY_KEY_SECRET,
});