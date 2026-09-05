"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OverviewCards } from "@/components/revenue/overview-cards";
import { OpportunityList } from "@/components/revenue/opportunity-list";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  RevenueOpportunitiesResponse,
  RevenueOpportunity,
  RevenueOverview,
  RevenueOverviewResponse,
} from "@/types/revenue";
import { ApprovalsResponse, Approval } from "@/types/approvals";
import { OrdersResponse, Order } from "@/types/orders";
import {
  ShieldAlert,
  ArrowRight,
  Bot,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Zap,
  TrendingUp,
  CreditCard,
  Layers,
  Database,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading, merchant } = useAuth();
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [opportunities, setOpportunities] = useState<RevenueOpportunity[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [oppsError, setOppsError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setOverviewError(null);
    setOppsError(null);

    try {
      const [overviewData, oppsData, approvalsData, ordersData] =
        await Promise.allSettled([
          api.get<RevenueOverviewResponse>("/revenue/overview"),
          api.get<RevenueOpportunitiesResponse>("/revenue/opportunities"),
          api.get<ApprovalsResponse>("/approvals", {
            params: { status: "PENDING" },
          }),
          api.get<OrdersResponse>("/orders"),
        ]);

      if (overviewData.status === "fulfilled") {
        setOverview(overviewData.value.overview);
      } else {
        const reason = overviewData.reason;
        setOverviewError(
          reason instanceof ApiError || reason instanceof Error
            ? reason.message
            : "Failed to load revenue overview"
        );
      }

      if (oppsData.status === "fulfilled") {
        setOpportunities(oppsData.value.opportunities);
      } else {
        const reason = oppsData.reason;
        setOppsError(
          reason instanceof ApiError || reason instanceof Error
            ? reason.message
            : "Failed to load opportunities"
        );
      }

      if (approvalsData.status === "fulfilled") {
        setPendingApprovals(approvalsData.value.approvals || []);
      }

      if (ordersData.status === "fulfilled") {
        setRecentOrders((ordersData.value.orders || []).slice(0, 5));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              {merchant ? `${merchant.name} Control Center` : "CommerceOS Control Center"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Autonomous commerce operating system: intelligence, AI proposals, policy gates, and live settlements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading || !isAuthenticated}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Unauthenticated State Prompt */}
        {!authLoading && !isAuthenticated && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Sign in to access your merchant store
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Authenticate with your credentials or 1-click demo access to inspect live commerce data.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button size="sm" className="text-xs">
                  Sign In with Demo
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm" className="text-xs">
                  Register Store
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Pending Approvals Alert Banner */}
        {pendingApprovals.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>
                    {pendingApprovals.length} AI Action Proposal
                    {pendingApprovals.length > 1 ? "s" : ""} Awaiting Sign-Off
                  </span>
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Action Required
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI detected high-impact inventory and pricing opportunities that have passed policy guardrails.
                </p>
              </div>
            </div>

            <Link href="/approvals">
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                Review Approvals ({pendingApprovals.length})
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Overview KPI Cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Key Performance Indicators
          </h2>
          <OverviewCards
            overview={overview}
            isLoading={isLoading || authLoading}
            error={overviewError}
            onRetry={fetchData}
          />
        </div>

        {/* CommerceOS Agentic Loop Architecture Strip */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Agentic Commerce Closed-Loop Architecture</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Autonomous & Human-Gated
            </span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-center space-y-1">
              <span className="font-semibold block text-foreground">1. Commerce Data</span>
              <span className="text-[11px] text-muted-foreground block">Real-time DB & Orders</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-center space-y-1">
              <span className="font-semibold block text-foreground">2. Opportunity</span>
              <span className="text-[11px] text-muted-foreground block">Stock & Demand Engine</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-center space-y-1">
              <span className="font-semibold block text-primary">3. AI Reasoner</span>
              <span className="text-[11px] text-muted-foreground block">LangGraph & Llama 3.3</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-center space-y-1">
              <span className="font-semibold block text-indigo-500">4. Policy Check</span>
              <span className="text-[11px] text-muted-foreground block">Safety Guardrails</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-center space-y-1">
              <span className="font-semibold block text-amber-500">5. Approval</span>
              <span className="text-[11px] text-muted-foreground block">Human-in-the-Loop</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-center space-y-1">
              <span className="font-semibold block text-emerald-500">6. Execution</span>
              <span className="text-[11px] text-muted-foreground block">Stock & Price Mutations</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-center space-y-1 col-span-2 md:col-span-1">
              <span className="font-semibold block text-emerald-600 dark:text-emerald-400">7. Razorpay</span>
              <span className="text-[11px] text-muted-foreground block">Settled & Audited</span>
            </div>
          </div>
        </div>

        {/* 2-Column Main Section: Opportunities & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Revenue Opportunities (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground tracking-wide">
                  Revenue Opportunities
                </h2>
                {opportunities.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {opportunities.length}
                  </span>
                )}
              </div>

              <Link
                href="/revenue"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                Analytics Details
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <OpportunityList
              opportunities={opportunities}
              isLoading={isLoading || authLoading}
              error={oppsError}
              onRetry={fetchData}
            />
          </div>

          {/* Right Column: Recent Activity & Quick Shortcuts (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Actions Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Operations
              </h2>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/buyer"
                  className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/70 transition-colors flex flex-col gap-1"
                >
                  <Bot className="h-4 w-4 text-cyan-500" />
                  <span className="font-semibold text-foreground">AI Buyer Demo</span>
                  <span className="text-[11px] text-muted-foreground">Autonomous purchase loop</span>
                </Link>

                <Link
                  href="/approvals"
                  className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/70 transition-colors flex flex-col gap-1"
                >
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-foreground">Approvals</span>
                  <span className="text-[11px] text-muted-foreground">Review recommendations</span>
                </Link>

                <Link
                  href="/products"
                  className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/70 transition-colors flex flex-col gap-1"
                >
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">Product Catalog</span>
                  <span className="text-[11px] text-muted-foreground">Manage stock & variants</span>
                </Link>

                <Link
                  href="/audit"
                  className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/70 transition-colors flex flex-col gap-1"
                >
                  <Database className="h-4 w-4 text-indigo-500" />
                  <span className="font-semibold text-foreground">Audit Trail</span>
                  <span className="text-[11px] text-muted-foreground">Inspect immutable logs</span>
                </Link>
              </div>
            </div>

            {/* Recent Orders List */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-500" />
                  Recent Orders & Settlements
                </h2>

                <Link
                  href="/orders"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  All Orders
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No orders placed yet.
                </div>
              ) : (
                <div className="divide-y divide-border text-xs">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-mono font-semibold text-primary hover:underline"
                        >
                          #{order.id.slice(-8)}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">
                          {order.customer?.name || "Guest Customer"}
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="font-semibold text-foreground">
                          {formatCurrency(order.total, order.currency)}
                        </div>
                        <OrderStatusBadge status={order.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}