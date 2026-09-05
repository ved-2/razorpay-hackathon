"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  RefreshCw,
  Lock,
} from "lucide-react";

interface CheckoutItem {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CheckoutCustomer {
  name: string;
  email: string;
  phone?: string | null;
}

interface CheckoutPayment {
  id: string;
  provider: string;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  status: string;
}

interface CheckoutOrder {
  id: string;
  status: string;
  currency: string;
  total: number;
  items: CheckoutItem[];
  customer?: CheckoutCustomer;
  payments?: CheckoutPayment[];
  createdAt: string;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || searchParams.get("id");
  const autoPay = searchParams.get("pay") === "true";

  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [payment, setPayment] = useState<CheckoutPayment | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>("rzp_test_TXuMQJSPHWC4sA");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`http://localhost:4000/buyer/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Order not found");
      }

      setOrder(data.order);
      setPayment(data.payment);
      if (data.razorpayKeyId) {
        setRazorpayKeyId(data.razorpayKeyId);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load order details"
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const loadRazorpayScript = async (): Promise<boolean> => {
    if (typeof window !== "undefined" && (window as unknown as { Razorpay?: unknown }).Razorpay) {
      return true;
    }
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleLaunchRazorpay = useCallback(async () => {
    if (!order || !payment?.providerOrderId) {
      setErrorMessage("Razorpay order information is missing.");
      return;
    }

    setIsPaying(true);
    setErrorMessage(null);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setErrorMessage("Failed to load Razorpay checkout script.");
        setIsPaying(false);
        return;
      }

      type RazorpayCheckoutInstance = { open: () => void };
      type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckoutInstance;
      const RazorpayClass = (window as unknown as { Razorpay: RazorpayConstructor }).Razorpay;

      const rzp = new RazorpayClass({
        key: razorpayKeyId,
        amount: payment.amount || order.total,
        currency: order.currency || "INR",
        name: "CommerceOS Checkout",
        description: `Order #${order.id.slice(-8)}`,
        order_id: payment.providerOrderId,
        prefill: {
          name: order.customer?.name || "Autonomous Buyer",
          email: order.customer?.email || "buyer@commerceos.ai",
          contact: order.customer?.phone || "+919999911111",
        },
        theme: { color: "#0f172a" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch(
              `http://localhost:4000/buyer/orders/${order.id}/verify`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed");
            }

            setOrder(verifyData.order);
            setPayment(verifyData.payment);
            setSuccessMessage("Payment verified and settled successfully!");
          } catch (err) {
            setErrorMessage(
              err instanceof Error ? err.message : "Verification error"
            );
          } finally {
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
          },
        },
      });

      rzp.open();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to open payment gateway"
      );
      setIsPaying(false);
    }
  }, [order, payment, razorpayKeyId]);

  const handleInstantSettle = async () => {
    if (!order || !payment?.providerOrderId) return;

    setIsPaying(true);
    setErrorMessage(null);

    try {
      const verifyRes = await fetch(
        `http://localhost:4000/buyer/orders/${order.id}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: payment.providerOrderId,
            razorpayPaymentId: `pay_demo_${Date.now()}`,
            razorpaySignature: "demo_sig_verified_via_extension",
          }),
        }
      );

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Instant settlement failed");
      }

      setOrder(verifyData.order);
      setPayment(verifyData.payment);
      setSuccessMessage("Instant autonomous settlement confirmed!");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Instant settlement error"
      );
    } finally {
      setIsPaying(false);
    }
  };

  // Auto-launch if ?pay=true
  useEffect(() => {
    if (autoPay && order && order.status === "PENDING_PAYMENT" && payment?.providerOrderId) {
      handleLaunchRazorpay();
    }
  }, [autoPay, order?.status, payment?.providerOrderId, handleLaunchRazorpay]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 space-y-3">
        <RefreshCw className="h-7 w-7 animate-spin text-slate-600" />
        <p className="text-xs font-medium text-slate-500">Preparing secure checkout option...</p>
      </div>
    );
  }

  if (errorMessage && !order) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-9 w-9 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Checkout Error</h2>
          <p className="text-xs text-slate-600">{errorMessage}</p>
          <Link href="/" className="inline-block mt-2">
            <Button variant="outline" size="sm" className="rounded-lg border-slate-200">
              Return to Store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">No Order ID Provided</h2>
          <p className="text-xs text-slate-500">Please provide an order ID to proceed with checkout.</p>
          <Link href="/" className="inline-block mt-2">
            <Button variant="outline" size="sm" className="rounded-lg border-slate-200">
              Go to Store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.status === "PAID";

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-5">
        {/* Top Branding Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-950 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              C
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                CommerceOS
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  CHECKOUT
                </span>
              </h1>
              <p className="text-[11px] text-slate-500">Autonomous Agentic Commerce Settlement</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Razorpay 256-bit Secured</span>
          </div>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2.5">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-center gap-2.5">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          {/* Order Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-slate-400">
                Order #{order.id.slice(-8).toUpperCase()}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {isPaid ? "Payment Completed & Verified" : "Checkout Summary"}
              </h2>
            </div>

            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                isPaid
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {isPaid ? "✓ Paid & Settled" : "Awaiting Settlement"}
            </span>
          </div>

          {/* Itemized list */}
          <div className="divide-y divide-slate-100 border-y border-slate-100 py-2">
            {order.items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900">{item.productName}</p>
                  <p className="text-slate-500">
                    {item.variantName} • <span className="font-mono text-slate-700">{item.sku}</span>
                  </p>
                  <p className="text-slate-400 text-[11px]">Qty: {item.quantity}</p>
                </div>
                <div className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                  {formatCurrency(item.totalPrice, order.currency)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="text-slate-800 font-medium">{order.customer?.name || "Autonomous Buyer"}</span>
            </div>
            {payment?.providerOrderId && (
              <div className="flex justify-between font-mono text-[11px]">
                <span>Razorpay Order ID:</span>
                <span className="text-blue-700 font-medium">{payment.providerOrderId}</span>
              </div>
            )}
            <div className="flex justify-between pt-2.5 border-t border-slate-100 text-sm font-bold text-slate-900 items-baseline">
              <span className="text-slate-700">Total Amount:</span>
              <span className="text-slate-950 font-mono text-xl font-bold tracking-tight tabular-nums">
                {formatCurrency(order.total, order.currency)}
              </span>
            </div>
          </div>

          {/* Action Area */}
          {!isPaid ? (
            <div className="space-y-2.5 pt-2">
              <Button
                onClick={handleLaunchRazorpay}
                disabled={isPaying}
                className="w-full bg-[#0C2340] hover:bg-[#071526] text-white font-bold py-3 text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                {isPaying ? "Opening Razorpay..." : "Pay with Razorpay Checkout"}
              </Button>

              <Button
                variant="outline"
                onClick={handleInstantSettle}
                disabled={isPaying}
                className="w-full border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs py-2.5 rounded-xl font-semibold cursor-pointer transition-colors"
              >
                ⚡ Instant Autonomous Settle (Demo Mode)
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-800">
                  Cryptographic Payment Verified
                </p>
                <p className="text-[11px] text-slate-600">
                  Inventory was atomically decremented and audit logs are recorded.
                </p>
              </div>

              <div className="flex gap-2">
                <Link href={`/orders/${order.id}`} className="flex-1">
                  <Button variant="outline" className="w-full text-xs rounded-lg border-slate-200 text-slate-700">
                    View in Dashboard
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button className="w-full text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                    Return to Store
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400 font-medium">
          CommerceOS • Real-Time Autonomous Commerce for Razorpay
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
