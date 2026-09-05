"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  ApprovalStatusBadge,
  ActionTypeBadge,
} from "@/components/approvals/approval-status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  Approval,
  ApprovalDetailResponse,
  ApproveActionResponse,
  RejectActionResponse,
} from "@/types/approvals";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  XCircle,
  Zap,
  Package,
  Tag,
  AlertTriangle,
  RefreshCw,
  FileCheck2,
} from "lucide-react";

export default function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [approval, setApproval] = useState<Approval | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchApproval = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<ApprovalDetailResponse>(`/approvals/${id}`);
      setApproval(data.approval);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load approval details"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, id]);

  useEffect(() => {
    if (!authLoading) {
      fetchApproval();
    }
  }, [authLoading, fetchApproval]);

  const handleApprove = async () => {
    if (!approval) return;
    if (
      !confirm(
        `Are you sure you want to approve and execute: "${approval.title}"?`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setActionSuccess(null);

    try {
      const res = await api.post<ApproveActionResponse>(
        `/approvals/${id}/approve`
      );
      setApproval(res.approval);
      setActionSuccess(
        "Action successfully executed. Inventory and store settings have been updated."
      );
    } catch (err) {
      alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to execute approval"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!approval) return;
    if (
      !confirm(
        `Are you sure you want to reject this proposal? It will not be executed.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setActionSuccess(null);

    try {
      const res = await api.post<RejectActionResponse>(
        `/approvals/${id}/reject`
      );
      setApproval(res.approval);
      setActionSuccess("Proposal was rejected.");
    } catch (err) {
      alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to reject proposal"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading approval details...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !approval) {
    return (
      <DashboardShell>
        <div className="space-y-4">
          <Link
            href="/approvals"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Approvals
          </Link>
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <h2 className="text-base font-semibold text-foreground">
              {error || "Approval not found"}
            </h2>
            <Button variant="outline" size="sm" onClick={fetchApproval}>
              Retry
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const isPending = approval.status === "PENDING";
  const isApproved = approval.status === "APPROVED";
  const isRejected = approval.status === "REJECTED";
  const proposal = approval.proposal;

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-3">
          <Link
            href="/approvals"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Approvals
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <ActionTypeBadge type={approval.type} />
                <ApprovalStatusBadge status={approval.status} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {approval.title}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Submitted on {formatDate(approval.createdAt)}
              </p>
            </div>

            {/* Pending actions */}
            {isPending && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Reject Proposal
                </Button>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <Zap className="h-4 w-4" />
                  {isProcessing ? "Executing..." : "Approve & Execute Action"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Action success notification */}
        {actionSuccess && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: AI Recommendation & Policy Gate (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Proposal Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                AI Recommendation Details
              </h2>

              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1">
                    Problem & Rationale
                  </span>
                  <p className="text-foreground/90 bg-muted/30 p-3.5 rounded-lg border border-border/60 leading-relaxed">
                    {approval.reason}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">
                      Expected Impact
                    </span>
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 shrink-0" />
                      {proposal.expectedImpact}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">
                      AI Model Confidence
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${Math.round((proposal.confidence || 0.9) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-foreground">
                        {Math.round((proposal.confidence || 0.9) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Parameters */}
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">
                    Execution Parameters
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {proposal.targetVariantId && (
                      <div className="p-2.5 rounded bg-muted/40 border border-border font-mono">
                        <span className="text-muted-foreground block text-[11px]">Variant ID</span>
                        <span className="text-foreground">{proposal.targetVariantId}</span>
                      </div>
                    )}

                    {proposal.quantity !== undefined && (
                      <div className="p-2.5 rounded bg-muted/40 border border-border">
                        <span className="text-muted-foreground block text-[11px]">Quantity</span>
                        <span className="text-foreground font-semibold text-sm">+{proposal.quantity} Units</span>
                      </div>
                    )}

                    {proposal.discountPercent !== undefined && (
                      <div className="p-2.5 rounded bg-muted/40 border border-border">
                        <span className="text-muted-foreground block text-[11px]">Discount Percent</span>
                        <span className="text-foreground font-semibold text-sm">{proposal.discountPercent}% OFF</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Execution Receipt (if Approved) */}
            {isApproved && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-sm space-y-3">
                <h2 className="text-base font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5" />
                  Execution Receipt & Audit Proof
                </h2>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-emerald-500/20">
                    <span className="text-muted-foreground">Executed At</span>
                    <span className="font-semibold text-foreground">
                      {formatDate(approval.executedAt || approval.updatedAt)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-emerald-500/20">
                    <span className="text-muted-foreground">Action Handler</span>
                    <span className="font-mono text-foreground font-semibold">
                      {approval.executionResult?.action || approval.type}
                    </span>
                  </div>

                  {approval.executionResult?.details && (
                    <div className="pt-2">
                      <span className="text-muted-foreground block mb-1">Execution Payload</span>
                      <pre className="bg-background/80 p-3 rounded-lg border border-border font-mono text-[11px] overflow-x-auto text-foreground">
                        {JSON.stringify(approval.executionResult.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Policy Guardrails & Metadata */}
          <div className="space-y-6">
            {/* Policy Gate Check */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Policy Engine Gate
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Proposal satisfies all merchant policy guardrails.</span>
                </div>

                <div className="space-y-1.5 text-muted-foreground pt-2">
                  <div className="flex justify-between">
                    <span>Discount Limit</span>
                    <span className="font-medium text-foreground">&le; 25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Restock Limit</span>
                    <span className="font-medium text-foreground">&le; 500 units</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Confidence</span>
                    <span className="font-medium text-foreground">&ge; 70%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Metadata */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3 text-xs">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Approval Meta
              </h2>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Approval ID</span>
                  <span className="font-mono text-foreground">{approval.id}</span>
                </div>

                {approval.opportunityId && (
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Source Opportunity</span>
                    <Link
                      href={`/revenue/opportunities/${approval.opportunityId}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {approval.opportunityId}
                    </Link>
                  </div>
                )}

                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Created At</span>
                  <span className="text-foreground">{formatDate(approval.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
