"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OverviewCards } from "@/components/revenue/overview-cards";
import { OpportunityList } from "@/components/revenue/opportunity-list";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/features/auth/auth-context";

// UI components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  RevenueOpportunitiesResponse,
  RevenueOpportunity,
  RevenueOverview,
  RevenueOverviewResponse,
} from "@/types/revenue";
import { ApprovalsResponse, Approval } from "@/types/approvals";
import { OrdersResponse, Order } from "@/types/orders";

import {
  RefreshCw,
  Package,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Inbox,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading, merchant, loginAsDemo } = useAuth();
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
      const [overviewRes, oppsRes, approvalsRes, ordersRes] = await Promise.allSettled([
        api.get<RevenueOverviewResponse>("/revenue/overview"),
        api.get<RevenueOpportunitiesResponse>("/revenue/opportunities"),
        api.get<ApprovalsResponse>("/approvals?status=PENDING"),
        api.get<OrdersResponse>("/orders?limit=6"),
      ]);

      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value.overview);
      } else {
        console.warn("Failed to load overview:", overviewRes.reason);
      }

      if (oppsRes.status === "fulfilled") {
        setOpportunities(oppsRes.value.opportunities || []);
      } else {
        console.warn("Failed to load opportunities:", oppsRes.reason);
      }

      if (approvalsRes.status === "fulfilled") {
        setPendingApprovals(approvalsRes.value.approvals || []);
      } else {
        console.warn("Failed to load approvals:", approvalsRes.reason);
      }

      if (ordersRes.status === "fulfilled") {
        setRecentOrders(ordersRes.value.orders || []);
      } else {
        console.warn("Failed to load recent orders:", ordersRes.reason);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
      setOverviewError(msg);
      setOppsError(msg);
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
      <TooltipProvider>
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Top Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  <Zap className="h-3 w-3 text-slate-900" />
                  {merchant?.name ?? "Apex Athletics"}
                </span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-xs font-medium text-slate-500">Autonomous Operations</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Store Command Center
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchData}
                      disabled={isLoading || !isAuthenticated}
                      className="h-9 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={`mr-2 h-3.5 w-3.5 text-slate-500 ${
                          isLoading ? "animate-spin" : ""
                        }`}
                      />
                      {isLoading ? "Syncing..." : "Sync State"}
                    </Button>
                  }
                />
                <TooltipContent side="bottom" className="text-xs font-normal">
                  Pull latest orders, inventory & price streams
                </TooltipContent>
              </Tooltip>

              <Link
                href="/products"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Manage Catalog
              </Link>
            </div>
          </div>

          {/* Pending Approvals Gated Alert */}
          {pendingApprovals.length > 0 && (
            <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-950">
                        {pendingApprovals.length} Action{pendingApprovals.length > 1 ? "s" : ""} Pending Sign-off
                      </span>
                      <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[10px] font-semibold px-2 py-0">
                        Policy Gated
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-800 mt-0.5">
                      New dynamic inventory and discount proposals are held by safety guardrails awaiting human authorization.
                    </p>
                  </div>
                </div>

                <Link
                  href="/approvals"
                  className="shrink-0 inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-amber-900 hover:bg-amber-950 text-white text-xs font-medium px-3.5 shadow-xs transition-colors cursor-pointer"
                >
                  Open Approvals Queue
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          

          {/* Unauthenticated Alert Banner */}
          {!authLoading && !isAuthenticated && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-900 border border-blue-200">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-950">
                      Viewing in Unauthenticated Mode
                    </span>
                    <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[10px] font-semibold px-2 py-0">
                      Signed Out
                    </Badge>
                  </div>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Sign in with the Demo Store merchant account to load live revenue metrics, inventory health, and AI actions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={loginAsDemo}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-8.5 px-3.5 shadow-xs cursor-pointer"
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Sign In as Demo Merchant
                </Button>
                <Link
                  href="/login"
                  className="inline-flex h-8.5 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  Manual Login
                </Link>
              </div>
            </div>
          )}

          {/* Revenue Analytics Overview */}
          <Card className="rounded-xl border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Revenue & Inventory Liquidity
                  </CardTitle>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-slate-500 font-medium">
                  Continuous Ledger
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <OverviewCards
                overview={overview}
                isLoading={isLoading || authLoading}
                error={overviewError}
                onRetry={fetchData}
              />
            </CardContent>
          </Card>

          {/* Quick Operations Matrix */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                title: "Product Catalog",
                desc: "Live variants, SKUs & stock counts",
                href: "/products",
                icon: Package,
                badge: "Active",
              },
              {
                title: "Policy Approvals",
                desc: "Review held price mutations & triggers",
                href: "/approvals",
                icon: ShieldCheck,
                count: pendingApprovals.length,
              },
              {
                title: "Audit Trail",
                desc: "Immutable cryptographic ledger traces",
                href: "/audit",
                icon: Layers,
                badge: "Audited",
              },
              {
                title: "Buyer Testing",
                desc: "Run autonomous AI purchase simulation",
                href: "/buyer",
                icon: ArrowUpRight,
                badge: "Sandbox",
              },
            ].map((item) => (
              <Link key={item.title} href={item.href} className="group">
                <Card className="h-full rounded-xl border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-150 hover:border-slate-300 hover:shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <item.icon className="h-4 w-4" />
                    </div>
                    {item.count !== undefined ? (
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {item.count} waiting
                      </span>
                    ) : (
                      <Badge variant="outline" className="border-slate-200 text-[10px] text-slate-500 font-medium">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </Card>
              </Link>
            ))}
          </div>

          {/* Primary Split: Opportunities & Recent Orders */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* Left: Dynamic Recommendations */}
            <Card className="xl:col-span-7 rounded-xl border-slate-200/80 bg-white shadow-xs flex flex-col justify-between overflow-hidden">
              <div>
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-slate-600" />
                      <CardTitle className="text-sm font-semibold text-slate-900">
                        Revenue Opportunities
                      </CardTitle>
                      {opportunities.length > 0 && (
                        <Badge className="bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0">
                          {opportunities.length}
                        </Badge>
                      )}
                    </div>
                    <Link
                      href="/revenue"
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
                    >
                      Insights
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <OpportunityList
                    opportunities={opportunities}
                    isLoading={isLoading || authLoading}
                    error={oppsError}
                    onRetry={fetchData}
                  />
                </CardContent>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Guardrails: Active</span>
                <span>Groq LPU Inference: Online</span>
              </div>
            </Card>

            {/* Right: Settled Transactions Table */}
            <Card className="xl:col-span-5 rounded-xl border-slate-200/80 bg-white shadow-xs flex flex-col justify-between overflow-hidden">
              <div>
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Recent Orders
                    </CardTitle>
                    <Link
                      href="/orders"
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
                    >
                      All Orders
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {recentOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                        <Inbox className="h-4.5 w-4.5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">No settled orders yet</p>
                      <p className="text-[11px] text-slate-400 max-w-[200px] mt-0.5">
                        Completed checkouts will display here as payments resolve.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-100 font-mono text-[10px]">
                          <TableHead className="py-2.5 px-4 font-semibold text-slate-500">ID / CUSTOMER</TableHead>
                          <TableHead className="py-2.5 px-4 text-right font-semibold text-slate-500">TOTAL</TableHead>
                          <TableHead className="py-2.5 px-4 text-right font-semibold text-slate-500">STATUS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {recentOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-slate-50/70 border-slate-100 transition-colors">
                            <TableCell className="py-2.5 px-4">
                              <Link
                                href={`/orders/${order.id}`}
                                className="font-mono text-xs font-semibold text-slate-900 hover:underline block"
                              >
                                #{order.id.slice(-6).toUpperCase()}
                              </Link>
                              <span className="text-[11px] text-slate-400 block truncate max-w-[120px]">
                                {order.customer?.name || "Guest Checkout"}
                              </span>
                            </TableCell>

                            <TableCell className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-900">
                              {formatCurrency(order.total, order.currency)}
                            </TableCell>

                            <TableCell className="py-2.5 px-4 text-right">
                              <OrderStatusBadge status={order.status} size="sm" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Instant Razorpay webhook sync</span>
                <Link
                  href="/orders"
                  className="text-[11px] font-semibold text-slate-700 hover:text-slate-950 inline-flex items-center gap-1"
                >
                  Ledger <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </Card>

          </div>
        </div>
      </TooltipProvider>
    </DashboardShell>
  );
}