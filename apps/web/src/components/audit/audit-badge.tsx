import { ActorType, AuditAction } from "@/types/audit";
import {
  User,
  Bot,
  Cpu,
  Globe,
  Zap,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  CreditCard,
  AlertCircle,
  ShoppingBag,
  Activity,
} from "lucide-react";

export function ActorTypeBadge({ actorType }: { actorType: ActorType | string }) {
  switch (actorType) {
    case "AI_AGENT":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 text-xs font-medium">
          <Bot className="h-3 w-3" />
          AI Agent
        </span>
      );
    case "USER":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2 py-0.5 text-xs font-medium">
          <User className="h-3 w-3" />
          Merchant User
        </span>
      );
    case "WEBHOOK":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-xs font-medium">
          <Globe className="h-3 w-3" />
          Razorpay Webhook
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 px-2 py-0.5 text-xs font-medium">
          <Cpu className="h-3 w-3" />
          System
        </span>
      );
  }
}

export function AuditActionBadge({ action }: { action: AuditAction | string }) {
  switch (action) {
    case "ACTION_EXECUTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold">
          <Zap className="h-3 w-3" />
          Action Executed
        </span>
      );
    case "APPROVAL_APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold">
          <CheckCircle2 className="h-3 w-3" />
          Approval Approved
        </span>
      );
    case "APPROVAL_REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 text-xs font-semibold">
          <XCircle className="h-3 w-3" />
          Approval Rejected
        </span>
      );
    case "POLICY_CHECKED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-xs font-semibold">
          <ShieldCheck className="h-3 w-3" />
          Policy Checked
        </span>
      );
    case "AI_PROPOSAL_CREATED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 text-xs font-semibold">
          <Sparkles className="h-3 w-3" />
          AI Proposal
        </span>
      );
    case "PAYMENT_VERIFIED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold">
          <CreditCard className="h-3 w-3" />
          Payment Verified
        </span>
      );
    case "PAYMENT_FAILED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 text-xs font-semibold">
          <AlertCircle className="h-3 w-3" />
          Payment Failed
        </span>
      );
    case "ORDER_CREATED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-xs font-semibold">
          <ShoppingBag className="h-3 w-3" />
          Order Created
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted text-muted-foreground border border-border px-2 py-0.5 text-xs font-medium">
          <Activity className="h-3 w-3" />
          {action}
        </span>
      );
  }
}
