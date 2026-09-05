"use client";

import { useState } from "react";
import { RazorpayResponse, RazorpayOptions } from "@/types/razorpay";

const API_URL = "http://localhost:4000";

export default function PaymentTestPage() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) {
      return true;
    }

    return await new Promise<boolean>((resolve) => {
      const script = document.createElement("script");

      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => {
        resolve(true);
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  }

  async function startPayment() {
    if (!orderId.trim()) {
      setMessage("Enter an order ID");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("Login token not found");
        return;
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        setMessage("Failed to load Razorpay Checkout");
        return;
      }

      const paymentResponse = await fetch(
  `${API_URL}/orders/${orderId}/payment`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        setMessage(paymentData.error ?? "Failed to create payment");
        return;
      }

      const payment = paymentData.payment;

      const razorpay = new window.Razorpay({
        key: payment.razorpayKeyId,
        amount: payment.amount,
        currency: payment.currency,
        name: "CommerceOS",
        description: "CommerceOS Test Payment",
        order_id: payment.providerOrderId,

        handler: async (response: RazorpayResponse) => {
          try {
            setMessage("Payment completed. Verifying...");

            const verifyResponse = await fetch(
              `${API_URL}/orders/${orderId}/payment/verify`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              console.error(
                "Payment verification error:",
                verifyData
              );

              setMessage(
                verifyData.error ?? "Payment verification failed"
              );

              return;
            }

            setMessage("Payment verified successfully!");
          } catch (error) {
            console.error(
              "Payment verification request failed:",
              error
            );

            setMessage(
              error instanceof Error
                ? error.message
                : "Payment verification failed"
            );
          }
        },

        theme: {
          color: "#000000",
        },
      });

      razorpay.open();
    } catch (error) {
      console.error("Payment test error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Payment failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">
        CommerceOS Payment Test
      </h1>

      <p className="mt-2 text-sm text-gray-500">
        Test Razorpay payments in Test Mode.
      </p>

      <input
        value={orderId}
        onChange={(event) => setOrderId(event.target.value)}
        placeholder="Enter CommerceOS order ID"
        className="mt-6 w-full rounded-md border p-3"
      />

      <button
        onClick={startPayment}
        disabled={loading}
        className="mt-4 rounded-md bg-black px-4 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Loading..." : "Pay with Razorpay"}
      </button>

      {message && (
        <p className="mt-4 text-sm">
          {message}
        </p>
      )}
    </main>
  );
}