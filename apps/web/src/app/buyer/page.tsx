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
  const [requireApproval, setRequireApproval] = useState<boolean>(false);
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
        requireApproval,
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
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                <Bot className="h-3 w-3 text-slate-900" />
                SIMULATION SUITE
              </span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xs font-medium text-slate-500">Autonomous Buyer Agent</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Autonomous Buyer Sandbox
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Simulate external AI agents discovering products, evaluating budget policies via Groq LPUs, and executing live Razorpay settlement.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            disabled={isLoadingProducts}
            className="flex items-center gap-2 self-start sm:self-auto rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${isLoadingProducts ? "animate-spin" : ""}`}
            />
            Refresh Catalog
          </Button>
        </div>

        {/* 2-Column Workflow Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Selection & AI Agent Policy (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Step 1: Select Product */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-slate-900" />
                1. Target Product & SKU
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1.5 font-medium">
                    Select Variant to Buy:
                  </label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Unit Price</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(
                          selectedVariant.price,
                          selectedVariant.currency || "INR"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Available Stock</span>
                      <span
                        className={`font-mono font-semibold ${
                          availableStock > 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        ● {availableStock} units available
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-slate-600 block mb-1 font-medium">
                    Quantity:
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, availableStock)}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="h-9 rounded-lg border-slate-200 bg-white text-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Agent Budget & Policy Configuration */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-900" />
                2. AI Buyer Constraints
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-slate-600 font-medium">
                      Max Price Budget (₹):
                    </label>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      ₹{maxBudgetRupees.toLocaleString()}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min={100}
                    value={maxBudgetRupees}
                    onChange={(e) => setMaxBudgetRupees(Number(e.target.value))}
                    className="h-9 rounded-lg border-slate-200 bg-white text-slate-900 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Agent will reject purchases exceeding this total cap.
                  </p>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-medium">
                    Required Keyword (Optional):
                  </label>
                  <Input
                    placeholder="e.g. Running, Socks, Bottle"
                    value={requiredKeyword}
                    onChange={(e) => setRequiredKeyword(e.target.value)}
                    className="h-9 rounded-lg border-slate-200 bg-white text-slate-900 text-xs"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={handleEvaluate}
                  disabled={isEvaluating || !selectedVariant}
                  className="w-full flex items-center justify-center gap-2 text-xs mt-2 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  {isEvaluating
                    ? "Evaluating Decision with Groq LPU..."
                    : "Evaluate with AI Buyer Agent"}
                </Button>

                {evalError && (
                  <p className="text-xs text-rose-600">{evalError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: AI Reasoning, Checkout, & Gateway (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Stage 1: AI Evaluation Output */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Bot className="h-4 w-4 text-slate-900" />
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
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      {evaluation.decision === "BUY" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>DECISION: BUY APPROVED</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-rose-600" />
                          <span>DECISION: REJECTED</span>
                        </>
                      )}
                    </div>

                    <div className="text-xs font-mono font-semibold text-slate-700">
                      Confidence: {Math.round(evaluation.confidence * 100)}%
                    </div>
                  </div>

                  {/* AI Rationale */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                      Agent Rationale
                    </span>
                    <p className="text-slate-800 leading-relaxed text-xs">
                      {evaluation.reason}
                    </p>
                  </div>

                  {/* Trigger Checkout Button if BUY */}
                  {evaluation.decision === "BUY" && !checkoutResult && (
                    <div className="space-y-3 pt-1">
                      {/* HITL Guardrail Toggle */}
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <input
                          type="checkbox"
                          id="hitl-approval-toggle"
                          checked={requireApproval}
                          onChange={(e) => setRequireApproval(e.target.checked)}
                          className="h-4 w-4 mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                        <label htmlFor="hitl-approval-toggle" className="text-xs text-slate-700 cursor-pointer select-none">
                          <span className="font-semibold block text-slate-900">🛡️ Require Human-in-the-Loop Approval</span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            Hold order proposal in the Merchant Approvals Queue (/approvals) for human sign-off before payment.
                          </span>
                        </label>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleCheckout}
                        disabled={isCheckingOut || availableStock < quantity}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-1.5 h-9 rounded-lg cursor-pointer"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        {isCheckingOut
                          ? "Reserving Inventory & Creating Order..."
                          : "Execute Autonomous Checkout"}
                      </Button>
                    </div>
                  )}

                  {checkoutError && (
                    <p className="text-xs text-rose-600">{checkoutError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Stage 2 & 3: Checkout Orchestration & Razorpay Gateway */}
            {checkoutResult && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-900" />
                  Stage 2 & 3: Order Orchestration & Settlement
                </h2>

                {/* HITL Pending Approval Alert if requested */}
                {checkoutResult.approvalRequired && checkoutResult.approval && (
                  <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-amber-700" />
                        Queued for Human-in-the-Loop Approval
                      </span>
                      <span className="text-[10px] font-mono bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold">
                        PENDING APPROVAL
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Order <strong>#{checkoutResult.order.id.slice(-8)}</strong> was created and inventory atomically reserved, but payment settlement is gated until a human approves this purchase in the control center.
                    </p>
                    <Link
                      href="/approvals"
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline hover:text-amber-700"
                    >
                      Open Merchant Approvals Queue →
                    </Link>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  {/* Order & Payment Details */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Order ID</span>
                      <span className="font-semibold text-slate-900">
                        {checkoutResult.order.id}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Razorpay Order ID</span>
                      <span className="text-blue-700 font-semibold">
                        {checkoutResult.payment.providerOrderId}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Order Total</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(
                          checkoutResult.order.total,
                          checkoutResult.order.currency
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Inventory Status</span>
                      <span className="text-amber-800 font-medium">
                        Atomically Reserved ({quantity} units)
                      </span>
                    </div>
                  </div>

                  {/* Payment Verification Status */}
                  {!settlementSuccess ? (
                    <div className="space-y-3 pt-1">
                      <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                        Order created and inventory reserved. Launch the Razorpay Test Gateway to complete test transaction.
                      </div>

                      <Button
                        onClick={handleLaunchPayment}
                        disabled={isVerifying}
                        className="w-full bg-[#0C2340] hover:bg-[#071526] text-white font-bold h-10 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
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
