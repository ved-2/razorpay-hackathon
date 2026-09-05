"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OverviewCards } from "@/components/revenue/overview-cards";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  RevenueAnalytics,
  RevenueAnalyticsResponse,
  RevenueByPeriod,
} from "@/types/revenue";

type PeriodTab = "day" | "week" | "month";

export default function RevenuePage() {
  const { isAuthenticated, isLoading: authLoading, merchant } = useAuth();
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [periodTab, setPeriodTab] = useState<PeriodTab>("day");

  const fetchAnalytics = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<RevenueAnalyticsResponse>("/revenue/analytics");
      setAnalytics(data.analytics);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load revenue analytics");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchAnalytics();
    }
  }, [authLoading, fetchAnalytics]);

  const getPeriodicData = (): RevenueByPeriod[] => {
    if (!analytics) return [];
    if (periodTab === "week") return analytics.revenueByWeek || [];
    if (periodTab === "month") return analytics.revenueByMonth || [];
    return analytics.revenueByDay || [];
  };

  const periodicData = getPeriodicData();
  const maxRevenue = Math.max(...periodicData.map((d) => d.revenue), 1);

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Revenue & Financial Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Granular financial velocity, periodic sales distribution, and SKU-level contribution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={isLoading || !isAuthenticated}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Refreshing..." : "Refresh Analytics"}
            </button>
          </div>
        </div>

        {/* Unauthenticated Alert */}
        {!authLoading && !isAuthenticated && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Sign in to inspect revenue performance
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Authentication is required to query store financial records.
              </p>
            </div>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* High-level KPI cards */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Overall Financial Health
          </h2>
          <OverviewCards
            overview={analytics?.overview}
            isLoading={isLoading || authLoading}
            error={error}
            onRetry={fetchAnalytics}
          />
        </div>

        {/* Periodic Revenue Distribution Chart/Breakdown */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Revenue Trajectory
              </h2>
              <p className="text-xs text-muted-foreground">
                Total gross revenue and order volume across selected intervals.
              </p>
            </div>

            {/* Interval Toggle */}
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1 text-xs">
              <button
                onClick={() => setPeriodTab("day")}
                className={`rounded-md px-3 py-1 font-medium transition-colors cursor-pointer ${
                  periodTab === "day"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setPeriodTab("week")}
                className={`rounded-md px-3 py-1 font-medium transition-colors cursor-pointer ${
                  periodTab === "week"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriodTab("month")}
                className={`rounded-md px-3 py-1 font-medium transition-colors cursor-pointer ${
                  periodTab === "month"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
              Aggregating periodic revenue distribution...
            </div>
          ) : periodicData.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
              No historical revenue transactions found for this interval.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {periodicData.slice(-10).map((item) => {
                const percentage = Math.round((item.revenue / maxRevenue) * 100);
                return (
                  <div key={item.period} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-medium">
                      <span className="font-mono text-muted-foreground">
                        {item.period}
                      </span>
                      <span className="text-foreground">
                        {formatCurrency(item.revenue, "INR")} •{" "}
                        <span className="text-muted-foreground">
                          {formatNumber(item.orders)} orders
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Products & Top Variants Contribution */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Products */}
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Top Products by Revenue
                </h3>
                <p className="text-xs text-muted-foreground">
                  Catalog listings driving top-line growth.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : !analytics?.topProducts || analytics.topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No product conversion data available yet.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {analytics.topProducts.map((prod, idx) => (
                  <div
                    key={prod.productId}
                    className="flex items-center justify-between py-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{prod.name}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {formatNumber(prod.unitsSold)} units sold
                        </p>
                      </div>
                    </div>
                    <div className="font-semibold text-foreground">
                      {formatCurrency(prod.revenue, "INR")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Variants */}
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Top SKU Velocity
                </h3>
                <p className="text-xs text-muted-foreground">
                  Specific variants generating repeat transactions.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : !analytics?.topVariants || analytics.topVariants.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No SKU velocity data available yet.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {analytics.topVariants.map((variant, idx) => (
                  <div
                    key={variant.variantId}
                    className="flex items-center justify-between py-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {variant.name}
                        </p>
                        <p className="text-muted-foreground text-[11px] font-mono">
                          {variant.sku} • {variant.productName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        {formatCurrency(variant.revenue, "INR")}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatNumber(variant.unitsSold)} units
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
