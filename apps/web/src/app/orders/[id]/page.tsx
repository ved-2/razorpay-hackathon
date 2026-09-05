"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Order, OrderDetailResponse } from "@/types/orders";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  ShieldCheck,
  User,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!isAuthenticated) {
      router.replace(`/checkout?orderId=${id}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<OrderDetailResponse>(`/orders/${id}`);
      setOrder(data.order);
      if (data.razorpayKeyId) {
        setRazorpayKeyId(data.razorpayKeyId);
      }
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load order details"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, id]);

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

  const handleLaunchRazorpay = async () => {
    if (!order) return;
    const latestPayment = order.payments?.[0];
    if (!latestPayment?.providerOrderId) {
      setPaymentError("Razorpay order ID is missing for this order.");
      return;
    }

    setIsPaying(true);
    setPaymentError(null);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPaymentError("Failed to load Razorpay checkout script.");
        setIsPaying(false);
        return;
      }

      const key =
        razorpayKeyId ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "rzp_test_TXuMQJSPHWC4sA";

      type RazorpayCheckoutInstance = { open: () => void };
      type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckoutInstance;
      const RazorpayClass = (window as unknown as { Razorpay: RazorpayConstructor }).Razorpay;

      const rzp = new RazorpayClass({
        key,
        amount: latestPayment.amount || order.total,
        currency: order.currency || "INR",
        name: "CommerceOS AI Buyer",
        description: `Order #${order.id.slice(-8)}`,
        order_id: latestPayment.providerOrderId,
        prefill: {
          name: order.customer?.name || "Autonomous Voice Buyer",
          email: order.customer?.email || "voice-agent@commerceos.ai",
          contact: order.customer?.phone || "+919999911111",
        },
        theme: { color: "#0f172a" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api.post(`/orders/${order.id}/payment/verify`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setActionSuccess("Payment successfully verified! Order is now PAID and inventory is settled.");
            await fetchOrder();
          } catch (err) {
            setPaymentError(
              err instanceof ApiError || err instanceof Error
                ? err.message
                : "Payment verification failed"
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
      setPaymentError(
        err instanceof Error ? err.message : "Failed to open Razorpay checkout"
      );
      setIsPaying(false);
    }
  };

  const handleInstantSettle = async () => {
    if (!order) return;
    const latestPayment = order.payments?.[0];
    if (!latestPayment?.providerOrderId) return;

    setIsPaying(true);
    setPaymentError(null);

    try {
      await api.post(`/orders/${order.id}/payment/verify`, {
        razorpayOrderId: latestPayment.providerOrderId,
        razorpayPaymentId: `pay_demo_${Date.now()}`,
        razorpaySignature: "demo_sig_verified_via_extension",
      });
      setActionSuccess("Instant autonomous settlement verified! Order is now PAID and inventory is settled.");
      await fetchOrder();
    } catch (err) {
      setPaymentError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Instant settlement failed"
      );
    } finally {
      setIsPaying(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchOrder();
    }
  }, [authLoading, fetchOrder]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (
      !confirm(
        "Are you sure you want to cancel this order? Reserved inventory will be immediately released back to available stock."
      )
    ) {
      return;
    }

    setIsCancelling(true);
    setActionSuccess(null);

    try {
      const response = await api.post<{ order: Order }>(`/orders/${id}/cancel`);
      setOrder(response.order);
      setActionSuccess("Order successfully cancelled and reserved inventory released.");
    } catch (err) {
      alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to cancel order"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (
      order &&
      order.status === "PENDING_PAYMENT" &&
      typeof window !== "undefined"
    ) {
      const search = new URLSearchParams(window.location.search);
      if (search.get("pay") === "true") {
        handleLaunchRazorpay();
      }
    }
  }, [order?.status]);

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading order details...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !order) {
    return (
      <DashboardShell>
        <div className="space-y-4">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <h2 className="text-base font-semibold text-foreground">
              {error || "Order not found"}
            </h2>
            <Button variant="outline" size="sm" onClick={fetchOrder}>
              Retry
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const latestPayment = order.payments?.[0];

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-3">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  Order #{order.id}
                </h1>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Placed on {formatDateTime(order.createdAt)}
              </p>
            </div>

            {order.status === "PENDING_PAYMENT" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex items-center gap-2 self-start sm:self-auto"
              >
                <XCircle className="h-4 w-4" />
                {isCancelling ? "Cancelling..." : "Cancel & Release Inventory"}
              </Button>
            )}
          </div>
        </div>

        {/* Action success notification */}
        {actionSuccess && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Lifecycle Flow Timeline */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
            Order & Settlement Lifecycle
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
            {/* Step 1: Created */}
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40 border border-border/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                1. Order Created
              </div>
              <p className="text-xs text-muted-foreground">
                Inventory reserved atomically.
              </p>
            </div>

            {/* Step 2: Payment Created */}
            <div
              className={`flex flex-col gap-1 p-3 rounded-lg border ${
                latestPayment
                  ? "bg-muted/40 border-border/50"
                  : "bg-muted/10 border-dashed border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                {latestPayment ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
                2. Razorpay Order
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {latestPayment?.providerOrderId || "Pending creation"}
              </p>
            </div>

            {/* Step 3: Payment Signature */}
            <div
              className={`flex flex-col gap-1 p-3 rounded-lg border ${
                latestPayment?.status === "VERIFIED"
                  ? "bg-muted/40 border-border/50"
                  : order.status === "CANCELLED"
                  ? "bg-rose-500/10 border-rose-500/20"
                  : "bg-muted/10 border-dashed border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                {latestPayment?.status === "VERIFIED" ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                ) : order.status === "CANCELLED" ? (
                  <XCircle className="h-4 w-4 text-rose-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                3. Signature Verified
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {latestPayment?.providerPaymentId || (order.status === "CANCELLED" ? "Order Cancelled" : "Awaiting signature")}
              </p>
            </div>

            {/* Step 4: Settlement */}
            <div
              className={`flex flex-col gap-1 p-3 rounded-lg border ${
                order.status === "PAID"
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : order.status === "CANCELLED"
                  ? "bg-rose-500/10 border-rose-500/20"
                  : "bg-muted/10 border-dashed border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                {order.status === "PAID" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : order.status === "CANCELLED" ? (
                  <XCircle className="h-4 w-4 text-rose-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                4. Inventory Settled
              </div>
              <p className="text-xs text-muted-foreground">
                {order.status === "PAID"
                  ? "Stock decremented"
                  : order.status === "CANCELLED"
                  ? "Stock released"
                  : "Pending payment"}
              </p>
            </div>
          </div>
        </div>

        {/* Step 4 Checkout Option Banner (shown when PENDING_PAYMENT) */}
        {order.status === "PENDING_PAYMENT" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-foreground">
                  Complete Razorpay Checkout
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Stock is reserved. Pay <strong className="text-foreground">{formatCurrency(order.total, order.currency)}</strong> to settle the transaction and record cryptographic proof.
              </p>
              {latestPayment?.providerOrderId && (
                <p className="text-[11px] font-mono text-muted-foreground">
                  Razorpay Order: {latestPayment.providerOrderId}
                </p>
              )}
              {paymentError && (
                <p className="text-xs font-medium text-destructive mt-2">
                  {paymentError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Button
                onClick={handleLaunchRazorpay}
                disabled={isPaying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2 w-full sm:w-auto shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                {isPaying ? "Opening Razorpay..." : "💳 Pay with Razorpay Checkout"}
              </Button>
              <Button
                variant="outline"
                onClick={handleInstantSettle}
                disabled={isPaying}
                className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium w-full sm:w-auto"
              >
                ⚡ Instant Settle (Demo)
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items (2 cols on large screen) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Purchased Items ({order.items.length})
              </h2>

              <div className="divide-y divide-border overflow-hidden">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium text-foreground text-sm">
                        {item.productName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.variantName} • <span className="font-mono">{item.sku}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Qty: {item.quantity} × {formatCurrency(item.unitPrice, order.currency)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-foreground text-sm">
                        {formatCurrency(item.totalPrice, order.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial summary breakdown */}
              <div className="pt-4 border-t border-border space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal, order.currency)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
                  <span>Total</span>
                  <span>{formatCurrency(order.total, order.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customer & Payment Details */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Customer
              </h2>

              <div className="space-y-1.5 text-xs">
                <div className="text-foreground font-medium text-sm">
                  {order.customer?.name || "Guest Customer"}
                </div>
                <div className="text-muted-foreground font-mono">
                  {order.customer?.email}
                </div>
                {order.customer?.phone && (
                  <div className="text-muted-foreground">
                    {order.customer?.phone}
                  </div>
                )}
                <div className="text-muted-foreground pt-1 border-t border-border text-[11px]">
                  Customer ID: <span className="font-mono">{order.customerId}</span>
                </div>
              </div>
            </div>

            {/* Payment & Provider Gateway Info */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Gateway
              </h2>

              {latestPayment ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gateway</span>
                    <span className="font-semibold uppercase text-foreground">
                      {latestPayment.provider} Test Mode
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payment Status</span>
                    <PaymentStatusBadge status={latestPayment.status} size="sm" />
                  </div>

                  {latestPayment.providerOrderId && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block">Razorpay Order ID</span>
                      <span className="font-mono text-[11px] break-all bg-muted p-1.5 rounded block text-foreground">
                        {latestPayment.providerOrderId}
                      </span>
                    </div>
                  )}

                  {latestPayment.providerPaymentId && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block">Razorpay Payment ID</span>
                      <span className="font-mono text-[11px] break-all bg-muted p-1.5 rounded block text-foreground">
                        {latestPayment.providerPaymentId}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-muted-foreground">Paid Amount</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(latestPayment.amount, latestPayment.currency)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>No payment transaction initiated for this order yet.</p>
                  {order.status === "PENDING_PAYMENT" && (
                    <p className="text-amber-600 dark:text-amber-400">
                      Awaiting checkout completion or payment gateway webhook.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
