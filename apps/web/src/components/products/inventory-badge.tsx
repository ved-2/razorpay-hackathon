"use client";

import { Inventory } from "@/types/products";

interface InventoryBadgeProps {
  inventory?: Inventory | null;
}

export function InventoryBadge({ inventory }: InventoryBadgeProps) {
  const quantity = inventory?.quantity ?? 0;
  const reserved = inventory?.reserved ?? 0;
  const available = Math.max(0, quantity - reserved);

  let statusText = "Healthy";
  let badgeColor =
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-400";

  if (available <= 2) {
    statusText = "Critical";
    badgeColor =
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-400";
  } else if (available <= 5) {
    statusText = "Low Stock";
    badgeColor =
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-400";
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${badgeColor}`}
        >
          {statusText}
        </span>
        <span className="text-xs font-semibold text-foreground font-mono">
          {available} avail
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {quantity} stock • {reserved} reserved
      </p>
    </div>
  );
}
