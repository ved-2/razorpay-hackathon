import { OrderStatus, PaymentStatus } from "@/types/orders";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

export function OrderStatusBadge({
  status,
  size = "md",
}: OrderStatusBadgeProps) {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  switch (status) {
    case "PAID":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Paid
        </span>
      );
    case "PENDING_PAYMENT":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ${sizeClasses}`}
        >
          <Clock className="h-3.5 w-3.5" />
          Pending Payment
        </span>
      );
    case "CANCELLED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 ${sizeClasses}`}
        >
          <XCircle className="h-3.5 w-3.5" />
          Cancelled
        </span>
      );
    case "FULFILLED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 ${sizeClasses}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Fulfilled
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground border border-border ${sizeClasses}`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {status}
        </span>
      );
  }
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  provider?: string;
  size?: "sm" | "md";
}

export function PaymentStatusBadge({
  status,
  provider,
  size = "md",
}: PaymentStatusBadgeProps) {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  const providerLabel = provider ? `${provider.toUpperCase()} • ` : "";

  switch (status) {
    case "VERIFIED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {providerLabel}Verified
        </span>
      );
    case "PROCESSING":
    case "VERIFICATION_PENDING":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
          {providerLabel}Processing
        </span>
      );
    case "CREATED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {providerLabel}Created
        </span>
      );
    case "FAILED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          {providerLabel}Failed
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground border border-border ${sizeClasses}`}
        >
          {providerLabel}
          {status}
        </span>
      );
  }
}
