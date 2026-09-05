"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  ApprovalStatusBadge,
  ActionTypeBadge,
} from "@/components/approvals/approval-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  Approval,
  ApprovalsResponse,
  ApproveActionResponse,
  RejectActionResponse,
} from "@/types/approvals";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function ApprovalsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string | undefined> = {};
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      const data = await api.get<ApprovalsResponse>("/approvals", { params });
      setApprovals(data.approvals || []);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load merchant approvals"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, statusFilter]);

  useEffect(() => {
    if (!authLoading) {
      fetchApprovals();
    }
  }, [authLoading, fetchApprovals]);

  const handleApprove = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to approve and execute: "${title}"?`)) {
      return;
    }

    setProcessingId(id);
    setActionSuccess(null);

    try {
      const res = await api.post<ApproveActionResponse>(
        `/approvals/${id}/approve`
      );
      setApprovals((prev) =>
        prev.map((app) => (app.id === id ? res.approval : app))
      );
      setActionSuccess(
        `Successfully executed: ${title}. Inventory and pricing changes are live.`
      );
    } catch (err) {
      alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to approve and execute action"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to reject: "${title}"?`)) {
      return;
    }

    setProcessingId(id);
    setActionSuccess(null);

    try {
      const res = await api.post<RejectActionResponse>(
        `/approvals/${id}/reject`
      );
      setApprovals((prev) =>
        prev.map((app) => (app.id === id ? res.approval : app))
      );
      setActionSuccess(`Proposal "${title}" was rejected.`);
    } catch (err) {
      alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to reject proposal"
      );
    } finally {
      setProcessingId(null);
    }
  };

  // KPIs
  const pendingCount = approvals.filter((a) => a.status === "PENDING").length;
  const approvedCount = approvals.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = approvals.filter((a) => a.status === "REJECTED").length;

  // Filtered approvals
  const filteredApprovals = approvals.filter((app) => {
    const q = searchQuery.toLowerCase();
    return (
      app.title.toLowerCase().includes(q) ||
      app.reason.toLowerCase().includes(q) ||
      app.type.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Merchant Approvals & Actions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Human-in-the-loop control center for AI recommendations and automated store operations
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchApprovals}
            disabled={isLoading}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Action success alert */}
        {actionSuccess && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-xs hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Pending Decisions
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingCount}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Executed Actions
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {approvedCount}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Rejected Proposals
              </span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {rejectedCount}
            </div>
          </div>
        </div>

        {/* Controls: Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted rounded-lg border border-border self-stretch sm:self-auto">
            {(
              [
                { label: "All Proposals", value: "ALL" },
                { label: "Pending", value: "PENDING" },
                { label: "Approved", value: "APPROVED" },
                { label: "Rejected", value: "REJECTED" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === filter.value
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, titles, reasons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchApprovals}>
              Retry
            </Button>
          </div>
        )}

        {/* Approvals List */}
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3 shadow-sm">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Loading approvals queue...</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3 shadow-sm">
            <ShieldCheck className="h-10 w-10 text-muted-foreground/50 mx-auto" />
            <h3 className="text-base font-medium text-foreground">No approvals found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "Try resetting your search query or status filter."
                : "When AI proposes revenue opportunities from the Revenue intelligence tab, merchant approvals will queue here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApprovals.map((app) => {
              const isPending = app.status === "PENDING";
              const isBusy = processingId === app.id;

              return (
                <div
                  key={app.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 transition-all hover:border-primary/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ActionTypeBadge type={app.type} size="sm" />
                        <ApprovalStatusBadge status={app.status} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          Created {formatDate(app.createdAt)}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground pt-1">
                        <Link
                          href={`/approvals/${app.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {app.title}
                        </Link>
                      </h3>
                    </div>

                    {/* Pending Action Buttons */}
                    {isPending ? (
                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(app.id, app.title)}
                          disabled={isBusy}
                          className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app.id, app.title)}
                          disabled={isBusy}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {isBusy ? "Executing..." : "Approve & Execute"}
                        </Button>
                      </div>
                    ) : (
                      <Link
                        href={`/approvals/${app.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                      >
                        View Details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  {/* Reason & Proposal Impact */}
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3.5 rounded-lg border border-border/60">
                    <div className="text-foreground font-medium text-xs uppercase tracking-wider mb-1">
                      AI Rationale & Context
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                      {app.reason}
                    </p>

                    {app.proposal && (
                      <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>
                            Impact:{" "}
                            <strong className="text-foreground font-semibold">
                              {app.proposal.expectedImpact || "N/A"}
                            </strong>
                          </span>
                        </div>

                        {app.proposal.quantity !== undefined && (
                          <div className="text-muted-foreground">
                            Restock Units:{" "}
                            <strong className="text-foreground font-semibold">
                              +{app.proposal.quantity}
                            </strong>
                          </div>
                        )}

                        {app.proposal.discountPercent !== undefined && (
                          <div className="text-muted-foreground">
                            Discount:{" "}
                            <strong className="text-foreground font-semibold">
                              {app.proposal.discountPercent}%
                            </strong>
                          </div>
                        )}

                        <div className="text-muted-foreground">
                          Confidence:{" "}
                          <strong className="text-foreground font-semibold">
                            {Math.round((app.proposal.confidence || 0.9) * 100)}%
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Execution receipt info if approved */}
                  {app.status === "APPROVED" && app.executionResult && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>
                          Action <strong>{app.executionResult.action}</strong> executed at{" "}
                          {formatDate(app.executedAt || app.updatedAt)}
                        </span>
                      </div>
                      <Link
                        href={`/approvals/${app.id}`}
                        className="font-medium hover:underline ml-2"
                      >
                        Receipt →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
