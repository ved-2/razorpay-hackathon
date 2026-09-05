import { ApprovalStatus } from "@/types/approvals";
import { CheckCircle2, Clock, XCircle, PackagePlus, Tag, Layers, HelpCircle, Bot } from "lucide-react";

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  size?: "sm" | "md";
}

export function ApprovalStatusBadge({
  status,
  size = "md",
}: ApprovalStatusBadgeProps) {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  switch (status) {
    case "APPROVED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approved & Executed
        </span>
      );
    case "PENDING":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ${sizeClasses}`}
        >
          <Clock className="h-3.5 w-3.5" />
          Pending Review
        </span>
      );
    case "REJECTED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 ${sizeClasses}`}
        >
          <XCircle className="h-3.5 w-3.5" />
          Rejected
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground border border-border ${sizeClasses}`}
        >
          {status}
        </span>
      );
  }
}

interface ActionTypeBadgeProps {
  type: string;
  size?: "sm" | "md";
}

export function ActionTypeBadge({ type, size = "md" }: ActionTypeBadgeProps) {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  switch (type) {
    case "RESTOCK":
    case "RESTOCK_INVENTORY":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 ${sizeClasses}`}
        >
          <PackagePlus className="h-3.5 w-3.5" />
          Restock Inventory
        </span>
      );
    case "DISCOUNT":
    case "CREATE_PROMOTION":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 ${sizeClasses}`}
        >
          <Tag className="h-3.5 w-3.5" />
          Price Discount
        </span>
      );
    case "BUNDLE":
    case "BUNDLE_PRODUCTS":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ${sizeClasses}`}
        >
          <Layers className="h-3.5 w-3.5" />
          Product Bundle
        </span>
      );
    case "AUTONOMOUS_BUYER_ORDER":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 ${sizeClasses}`}
        >
          <Bot className="h-3.5 w-3.5" />
          Autonomous Buyer Order
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md bg-muted text-muted-foreground border border-border ${sizeClasses}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {type}
        </span>
      );
  }
}
