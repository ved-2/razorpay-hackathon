"use client";

import { RevenueOverview } from "@/types/revenue";
import { formatCurrency, formatNumber } from "@/lib/format";

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
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
        <p className="text-sm font-medium text-destructive">
          Unable to load revenue metrics: {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
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
            className="rounded-xl border border-border/70 bg-card p-5 space-y-3 animate-pulse"
          >
            <div className="h-3.5 w-24 rounded-md bg-muted" />
            <div className="h-7 w-32 rounded-md bg-muted/80" />
            <div className="h-3 w-20 rounded-md bg-muted/50" />
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
      highlight: true,
    },
    {
      title: "Total Orders",
      value: formatNumber(overview?.totalOrders ?? 0),
      subtitle: `${overview?.paidOrders ?? 0} paid • ${(overview?.totalOrders ?? 0) - (overview?.paidOrders ?? 0)} pending`,
    },
    {
      title: "Avg. Order Value",
      value: formatCurrency(overview?.averageOrderValue ?? 0, "INR"),
      subtitle: "Per paid checkout",
    },
    {
      title: "Units Sold",
      value: formatNumber(overview?.unitsSold ?? 0),
      subtitle: "Physical items fulfilled",
    },
    {
      title: "Active Products",
      value: formatNumber(overview?.activeProducts ?? 0),
      subtitle: "Available in store catalog",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => (
        <div
          key={metric.title}
          className="rounded-xl border border-border/70 bg-card p-5 space-y-1 shadow-2xs hover:border-border transition-colors"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {metric.title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground pt-1">
            {metric.value}
          </p>
          <p className="text-xs text-muted-foreground pt-0.5">
            {metric.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
}
