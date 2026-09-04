import Razorpay from "razorpay";
import { RazorpayConfig } from "../types.js";

export function createRazorpayClient(config: RazorpayConfig): Razorpay {
  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
}
