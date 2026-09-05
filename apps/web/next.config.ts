import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_RAZORPAY_KEY_ID:
      process.env.RAZORPAY_KEY_ID || "rzp_test_TXuMQJSPHWC4sA",
  },
};

export default nextConfig;

