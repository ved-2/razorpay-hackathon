"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Product, ProductsResponse, ProductVariant } from "@/types/products";
import {
  BuyerEvaluation,
  BuyerEvaluateResponse,
  BuyerCheckoutResponse,
} from "@/types/buyer";
import {
  Bot,
  Sparkles,
  CheckCircle2,
  XCircle,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Zap,
} from "lucide-react";

export default function BuyerPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Products & Variants
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  // Buyer Agent Configuration
  const [maxBudgetRupees, setMaxBudgetRupees] = useState<number>(5000);
  const [requiredKeyword, setRequiredKeyword] = useState<string>("");

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<BuyerEvaluation | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Checkout state
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] =
    useState<BuyerCheckoutResponse | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Load products
  const fetchProducts = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoadingProducts(false);
      return;
    }

    setIsLoadingProducts(true);
    try {
      const data = await api.get<ProductsResponse>("/products");
      const prods = data.products || [];
      setProducts(prods);

      // Default select first available variant
      if (prods.length > 0 && prods[0].variants.length > 0) {
        setSelectedVariantId(prods[0].variants[0].id);
      }
    } catch {
      // Products fetch error
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchProducts();
    }
  }, [authLoading, fetchProducts]);

  // Find currently selected variant & product
  const selectedProduct = products.find((p) =>
    p.variants.some((v) => v.id === selectedVariantId)
  );
  const selectedVariant = selectedProduct?.variants.find(
    (v) => v.id === selectedVariantId
  );

  const availableStock = selectedVariant
    ? (selectedVariant.inventory?.quantity ?? 0) -
      (selectedVariant.inventory?.reserved ?? 0)
    : 0;

  // Load Razorpay Checkout Script
  async function loadRazorpayScript(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (window.Razorpay) return true;

    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  // 1. Evaluate with AI
  const handleEvaluate = async () => {
    if (!selectedVariant || !selectedProduct) return;

    setIsEvaluating(true);
    setEvaluation(null);
    setEvalError(null);
    setCheckoutResult(null);
    setSettlementSuccess(false);

    try {
      const res = await api.post<BuyerEvaluateResponse>("/buyer/evaluate", {
        product: {
          name: `${selectedProduct.name} - ${selectedVariant.name}`,
          price: selectedVariant.price,
          currency: selectedVariant.currency || "INR",
          sku: selectedVariant.sku,
          description: selectedProduct.description,
          productId: selectedProduct.id,
          variantId: selectedVariant.id,
        },
        policy: {
          maxPrice: maxBudgetRupees * 100,
          currency: "INR",
          requiredKeywords: requiredKeyword.trim()
            ? [requiredKeyword.trim()]
            : undefined,
        },
      });

      setEvaluation(res.evaluation);
    } catch (err) {
      setEvalError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Evaluation failed"
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  // 2. Autonomous Checkout
  const handleCheckout = async () => {
    if (!selectedVariant) return;

    setIsCheckingOut(true);
    setCheckoutError(null);
    setPaymentError(null);

    try {
      const res = await api.post<BuyerCheckoutResponse>("/buyer/checkout", {
        variantId: selectedVariant.id,
        quantity,
        customer: {
          name: "Autonomous Buyer Agent Alpha",
          email: "buyer-agent-alpha@commerceos.ai",
          phone: "+919999911111",
        },
        policy: {
          maxPrice: maxBudgetRupees * 100,
          currency: "INR",
        },
      });

      setCheckoutResult(res);
      fetchProducts(); // Refresh stock
    } catch (err) {
      setCheckoutError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Autonomous checkout failed"
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  // 3. Launch Razorpay Modal & Verify
  const handleLaunchPayment = async () => {
    if (!checkoutResult) return;

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPaymentError("Failed to load Razorpay checkout script.");
      return;
    }

    const { payment, order } = checkoutResult;

    const options = {
      key: payment.razorpayKeyId,
      amount: payment.amount,
      currency: payment.currency,
      name: "CommerceOS AI Buyer",
      description: `Autonomous Order #${order.id.slice(-8)}`,
      order_id: payment.providerOrderId,
      prefill: {
        name: "Autonomous Buyer Agent Alpha",
        email: "buyer-agent-alpha@commerceos.ai",
        contact: "9999911111",
      },
      theme: {
        color: "#0f172a",
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setIsVerifying(true);
        setPaymentError(null);

        try {
          await api.post(`/orders/${order.id}/payment/verify`, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          setSettlementSuccess(true);
          fetchProducts();
        } catch (err) {
          setPaymentError(
            err instanceof ApiError || err instanceof Error
              ? err.message
              : "Payment verification failed"
          );
        } finally {
          setIsVerifying(false);
        }
      },
      modal: {
        ondismiss: () => {
          // Modal closed
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Autonomous AI Buyer Experience
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Simulate an external autonomous AI agent discovering products, evaluating budget constraints, and executing purchases with live Razorpay settlement
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            disabled={isLoadingProducts}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoadingProducts ? "animate-spin" : ""}`}
            />
            Refresh Store
          </Button>
        </div>

        {/* 2-Column Workflow Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Selection & AI Agent Policy (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Step 1: Select Product */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                1. Target Product & SKU
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">
                    Select Variant to Buy:
                  </label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {products.flatMap((prod) =>
                      prod.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {prod.name} — {v.name} ({v.sku}) •{" "}
                          {formatCurrency(v.price, v.currency || "INR")}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {selectedVariant && (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(
                          selectedVariant.price,
                          selectedVariant.currency || "INR"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available Stock</span>
                      <span
                        className={`font-semibold ${
                          availableStock > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {availableStock} units
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-muted-foreground block mb-1">
                    Quantity:
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, availableStock)}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Agent Budget & Policy Configuration */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                2. AI Buyer Constraints
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-muted-foreground">
                      Max Price Budget (₹):
                    </label>
                    <span className="font-bold text-primary">
                      ₹{maxBudgetRupees.toLocaleString()}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min={100}
                    value={maxBudgetRupees}
                    onChange={(e) => setMaxBudgetRupees(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Agent will reject purchases exceeding this total cap.
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1">
                    Required Keyword (Optional):
                  </label>
                  <Input
                    placeholder="e.g. Running, Socks, Bottle"
                    value={requiredKeyword}
                    onChange={(e) => setRequiredKeyword(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={handleEvaluate}
                  disabled={isEvaluating || !selectedVariant}
                  className="w-full flex items-center justify-center gap-1.5 text-xs mt-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isEvaluating
                    ? "Evaluating Decision..."
                    : "Evaluate with AI Buyer"}
                </Button>

                {evalError && (
                  <p className="text-xs text-rose-500">{evalError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: AI Reasoning, Checkout, & Gateway (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Stage 1: AI Evaluation Output */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-500" />
                Stage 1: AI Agent Purchase Evaluation
              </h2>

              {!evaluation ? (
                <div className="p-8 text-center border border-dashed border-border rounded-lg text-muted-foreground text-xs space-y-1">
                  <Bot className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p>No evaluation run yet.</p>
                  <p className="text-[11px]">
                    Select a SKU and click <strong>Evaluate with AI Buyer</strong> to see agent reasoning.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Decision Banner */}
                  <div
                    className={`p-3.5 rounded-lg border flex items-center justify-between ${
                      evaluation.decision === "BUY"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {evaluation.decision === "BUY" ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          <span>DECISION: BUY APPROVED</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-rose-500" />
                          <span>DECISION: REJECTED</span>
                        </>
                      )}
                    </div>

                    <div className="text-xs font-semibold">
                      Confidence: {Math.round(evaluation.confidence * 100)}%
                    </div>
                  </div>

                  {/* AI Rationale */}
                  <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-1">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground block">
                      Agent Rationale
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {evaluation.reason}
                    </p>
                  </div>

                  {/* Trigger Checkout Button if BUY */}
                  {evaluation.decision === "BUY" && !checkoutResult && (
                    <Button
                      size="sm"
                      onClick={handleCheckout}
                      disabled={isCheckingOut || availableStock < quantity}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {isCheckingOut
                        ? "Reserving Inventory & Creating Order..."
                        : "Execute Autonomous Checkout"}
                    </Button>
                  )}

                  {checkoutError && (
                    <p className="text-xs text-rose-500">{checkoutError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Stage 2 & 3: Checkout Orchestration & Razorpay Gateway */}
            {checkoutResult && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-500" />
                  Stage 2 & 3: Order Orchestration & Razorpay Settlement
                </h2>

                <div className="space-y-3 text-xs">
                  {/* Order & Payment Details */}
                  <div className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order ID</span>
                      <span className="font-mono font-semibold text-foreground">
                        {checkoutResult.order.id}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Razorpay Order ID</span>
                      <span className="font-mono text-primary font-semibold">
                        {checkoutResult.payment.providerOrderId}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order Total</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(
                          checkoutResult.order.total,
                          checkoutResult.order.currency
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inventory Status</span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Atomically Reserved ({quantity} units)
                      </span>
                    </div>
                  </div>

                  {/* Payment Verification Status */}
                  {!settlementSuccess ? (
                    <div className="space-y-3 pt-1">
                      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                        Order created and inventory reserved. Launch the Razorpay Test Gateway to complete test transaction.
                      </div>

                      <Button
                        onClick={handleLaunchPayment}
                        disabled={isVerifying}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        {isVerifying
                          ? "Verifying Signature..."
                          : "Pay with Razorpay Checkout"}
                      </Button>

                      {paymentError && (
                        <p className="text-xs text-rose-500">{paymentError}</p>
                      )}
                    </div>
                  ) : (
                    /* Final Settlement Receipt */
                    <div className="space-y-4 pt-1">
                      <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          <span>Payment Verified & Inventory Settled!</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Razorpay cryptographic signature was validated. Inventory has been permanently settled, and an immutable audit event was logged.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <Link
                          href={`/orders/${checkoutResult.order.id}`}
                          className="flex-1"
                        >
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            View Order Detail
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                        <Link href="/audit" className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            Inspect Audit Trail
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
