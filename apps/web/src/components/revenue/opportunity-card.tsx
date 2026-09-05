"use client";

import Link from "next/link";
import { RevenueOpportunity } from "@/types/revenue";
import { ArrowRight, Sparkles } from "lucide-react";

interface OpportunityCardProps {
  opportunity: RevenueOpportunity;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const { id, type, priority, title, description, recommendation, data } =
    opportunity;

  const priorityBadgeColors = {
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
    MEDIUM: "bg-amber-50 text-amber-800 border-amber-200",
    LOW: "bg-slate-100 text-slate-700 border-slate-200",
  }[priority];

  const typeLabels = {
    LOW_STOCK: "Low Stock Alert",
    HIGH_DEMAND: "High Velocity Demand",
    CROSS_SELL: "Cross-Sell Bundle",
    LOW_CONVERSION: "Listing Conversion",
  }[type];

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 space-y-4">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            {typeLabels}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${priorityBadgeColors}`}
          >
            {priority} Priority
          </span>
        </div>

        {/* Title and Description */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-snug">
            {title}
          </h3>
          <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Data Highlights */}
        {data && Object.keys(data).length > 0 && (
          <div className="rounded-lg bg-slate-50 p-2.5 text-xs grid grid-cols-2 gap-2 border border-slate-200/70 font-mono">
            {data.availableStock !== undefined && (
              <div>
                <span className="text-slate-500 text-[11px]">Available:</span>{" "}
                <span className="font-semibold text-slate-900">
                  {String(data.availableStock)} units
                </span>
              </div>
            )}
            {data.recentSales !== undefined && (
              <div>
                <span className="text-slate-500 text-[11px]">Recent Sales:</span>{" "}
                <span className="font-semibold text-slate-900">
                  {String(data.recentSales)} units
                </span>
              </div>
            )}
            {data.recommendedRestock !== undefined && (
              <div>
                <span className="text-slate-500 text-[11px]">Recommended:</span>{" "}
                <span className="font-semibold text-emerald-700">
                  +{String(data.recommendedRestock)} units
                </span>
              </div>
            )}
            {data.sales !== undefined && (
              <div>
                <span className="text-slate-500 text-[11px]">Velocity:</span>{" "}
                <span className="font-semibold text-blue-700">
                  {String(data.sales)} orders
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recommendation Snippet */}
        <div className="text-xs text-slate-800 bg-blue-50/60 rounded-lg border border-blue-100 p-2.5 flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-900">Recommendation:</span>{" "}
            <span className="text-slate-700">{recommendation}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2">
        <Link
          href={`/revenue/opportunities/${id}`}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
        >
          <span>View Opportunity & AI Proposal</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
