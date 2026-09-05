"use client";

import { RevenueOverview } from "@/types/revenue";
import { formatCurrency, formatNumber } from "@/lib/format";
import { TrendingUp, ShoppingBag, DollarSign, Layers, Package } from "lucide-react";

interface OverviewCardsProps {
  overview?: RevenueOverview | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function OverviewCards({
  overview,
  isLoading,
  error,
  onRetry,
}: OverviewCardsProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-rose-800">
          Unable to load revenue metrics: {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            Retry Loading
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200/70 bg-white p-5 space-y-3 animate-pulse shadow-xs"
          >
            <div className="h-3.5 w-24 rounded bg-slate-100" />
            <div className="h-7 w-32 rounded bg-slate-200" />
            <div className="h-3 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Revenue",
      value: formatCurrency(overview?.totalRevenue ?? 0, "INR"),
      subtitle: `${overview?.paidOrders ?? 0} settled transactions`,
      icon: DollarSign,
      highlight: true,
      badge: "Settled",
    },
    {
      title: "Total Orders",
      value: formatNumber(overview?.totalOrders ?? 0),
      subtitle: `${overview?.paidOrders ?? 0} paid • ${(overview?.totalOrders ?? 0) - (overview?.paidOrders ?? 0)} pending`,
      icon: ShoppingBag,
      badge: "Real-time",
    },
    {
      title: "Avg. Order Value",
      value: formatCurrency(overview?.averageOrderValue ?? 0, "INR"),
      subtitle: "Per completed purchase",
      icon: TrendingUp,
    },
    {
      title: "Units Sold",
      value: formatNumber(overview?.unitsSold ?? 0),
      subtitle: "Fulfilled items",
      icon: Layers,
    },
    {
      title: "Active Products",
      value: formatNumber(overview?.activeProducts ?? 0),
      subtitle: "Available in catalog",
      icon: Package,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div
            key={metric.title}
            className={`rounded-xl border p-5 transition-all duration-150 ${
              metric.highlight
                ? "bg-gradient-to-b from-white to-blue-50/20 border-blue-200/80 shadow-xs ring-1 ring-blue-500/10"
                : "bg-white border-slate-200/80 shadow-xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                {metric.title}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                {metric.value}
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                {metric.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
