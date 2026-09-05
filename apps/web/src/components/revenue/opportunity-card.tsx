"use client";

import Link from "next/link";
import { RevenueOpportunity } from "@/types/revenue";

interface OpportunityCardProps {
  opportunity: RevenueOpportunity;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const { id, type, priority, title, description, recommendation, data } =
    opportunity;

  const priorityBadgeColors = {
    HIGH: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-400",
    MEDIUM:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-400",
    LOW: "bg-slate-50 text-slate-700 ring-slate-600/20 dark:bg-slate-900 dark:text-slate-400",
  }[priority];

  const typeLabels = {
    LOW_STOCK: "Low Stock Alert",
    HIGH_DEMAND: "High Velocity Demand",
    CROSS_SELL: "Cross-Sell Bundle",
    LOW_CONVERSION: "Listing Conversion",
  }[type];

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-2xs hover:border-border transition-all space-y-4">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {typeLabels}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityBadgeColors}`}
          >
            {priority} Priority
          </span>
        </div>

        {/* Title and Description */}
        <div>
          <h3 className="text-base font-semibold text-foreground leading-snug">
            {title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>

        {/* Data Highlights */}
        {data && Object.keys(data).length > 0 && (
          <div className="rounded-lg bg-muted/40 p-2.5 text-xs grid grid-cols-2 gap-2 border border-border/40">
            {data.availableStock !== undefined && (
              <div>
                <span className="text-muted-foreground">Available:</span>{" "}
                <span className="font-semibold text-foreground">
                  {String(data.availableStock)} units
                </span>
              </div>
            )}
            {data.recentSales !== undefined && (
              <div>
                <span className="text-muted-foreground">Recent Sales:</span>{" "}
                <span className="font-semibold text-foreground">
                  {String(data.recentSales)} units
                </span>
              </div>
            )}
            {data.recommendedRestock !== undefined && (
              <div>
                <span className="text-muted-foreground">Recommended:</span>{" "}
                <span className="font-semibold text-foreground">
                  +{String(data.recommendedRestock)} units
                </span>
              </div>
            )}
            {data.sales !== undefined && (
              <div>
                <span className="text-muted-foreground">Velocity:</span>{" "}
                <span className="font-semibold text-foreground">
                  {String(data.sales)} orders
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recommendation Snippet */}
        <div className="text-xs text-foreground/90 bg-primary/5 rounded-lg border border-primary/10 p-2.5">
          <span className="font-medium text-primary">Recommendation:</span>{" "}
          <span>{recommendation}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2">
        <Link
          href={`/revenue/opportunities/${id}`}
          className="inline-flex w-full items-center justify-center rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          View Opportunity & AI Proposal →
        </Link>
      </div>
    </div>
  );
}
