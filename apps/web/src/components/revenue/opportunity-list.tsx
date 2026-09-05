"use client";

import { RevenueOpportunity } from "@/types/revenue";
import { OpportunityCard } from "./opportunity-card";

interface OpportunityListProps {
  opportunities?: RevenueOpportunity[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function OpportunityList({
  opportunities = [],
  isLoading,
  error,
  onRetry,
}: OpportunityListProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
        <p className="text-sm font-medium text-destructive">
          Unable to load opportunities: {error}
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/70 bg-card p-5 space-y-3 animate-pulse h-64"
          >
            <div className="flex justify-between">
              <div className="h-3 w-20 rounded-md bg-muted" />
              <div className="h-4 w-16 rounded-full bg-muted" />
            </div>
            <div className="h-5 w-48 rounded-md bg-muted/80" />
            <div className="h-12 w-full rounded-md bg-muted/50" />
            <div className="h-8 w-full rounded-md bg-muted/30" />
          </div>
        ))}
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/10 p-8 text-center space-y-2">
        <p className="text-sm font-semibold text-foreground">
          No revenue opportunities detected
        </p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          CommerceOS continuously monitors sales velocity, inventory levels, and co-purchases to surface high-impact recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {opportunities.map((opportunity) => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} />
      ))}
    </div>
  );
}
