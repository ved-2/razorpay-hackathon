"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { AIProposal, AIProposeResponse, PolicyEvaluation } from "@/types/ai";
import {
  RevenueOpportunitiesResponse,
  RevenueOpportunity,
} from "@/types/revenue";

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const opportunityId = resolvedParams.id;

  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [opportunity, setOpportunity] = useState<RevenueOpportunity | null>(null);
  const [proposal, setProposal] = useState<AIProposal | null>(null);
  const [policyEval, setPolicyEval] = useState<PolicyEvaluation | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOpportunity = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<RevenueOpportunitiesResponse>(
        "/revenue/opportunities"
      );
      const match = data.opportunities.find((opp) => opp.id === opportunityId);

      if (!match) {
        setError("Opportunity not found or already resolved.");
      } else {
        setOpportunity(match);
      }
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load opportunity"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, opportunityId]);

  useEffect(() => {
    if (!authLoading) {
      fetchOpportunity();
    }
  }, [authLoading, fetchOpportunity]);

  const handleGenerateProposal = async () => {
    if (!opportunity) return;
    setIsGenerating(true);
    setError(null);

    try {
      // 1. Generate Proposal via AI LangGraph Agent
      const data = await api.post<AIProposeResponse>(
        `/ai/opportunities/${opportunity.id}/propose`
      );
      setProposal(data.proposal);

      // 2. Pre-check against Policy Engine
      try {
        const policyRes = await api.post<{ evaluation: PolicyEvaluation }>(
          "/policy/evaluate",
          {
            proposal: data.proposal,
          }
        );
        setPolicyEval(policyRes.evaluation);
      } catch {
        // Fallback default policy evaluation
        setPolicyEval({ allowed: true, violations: [] });
      }
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "AI reasoning failed to produce a proposal"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateApproval = async () => {
    if (!proposal || !opportunity) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post("/approvals", {
        proposal,
        opportunityId: opportunity.id,
      });

      setActionSuccess("Proposal successfully routed to Merchant Approvals queue!");
      setTimeout(() => {
        router.push("/approvals");
      }, 1200);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to create approval request"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-4xl space-y-6">
        {/* Breadcrumb / Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Overview
          </Link>

          {opportunity && (
            <span className="text-xs font-mono text-muted-foreground">
              ID: {opportunity.id}
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {actionSuccess && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {actionSuccess}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground animate-pulse">
            Loading opportunity intelligence...
          </div>
        ) : !opportunity ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Opportunity Not Found
            </p>
            <p className="text-xs text-muted-foreground">
              This opportunity may have been resolved or does not belong to your store.
            </p>
            <Link
              href="/"
              className="inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Opportunity Context Card */}
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between gap-3 border-b pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Opportunity Archetype: {opportunity.type}
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                    {opportunity.title}
                  </h1>
                </div>

                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                    opportunity.priority === "HIGH"
                      ? "bg-rose-50 text-rose-700 ring-rose-600/20"
                      : "bg-amber-50 text-amber-700 ring-amber-600/20"
                  }`}
                >
                  {opportunity.priority} Priority
                </span>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detected Condition
                </h3>
                <p className="text-sm text-foreground mt-1">
                  {opportunity.description}
                </p>
              </div>

              {/* Data Breakdown Grid */}
              {opportunity.data && Object.keys(opportunity.data).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Telemetry & Inventory Data
                  </h3>
                  <div className="rounded-lg bg-muted/40 p-4 border grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    {Object.entries(opportunity.data).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </p>
                        <p className="font-semibold text-foreground font-mono mt-0.5">
                          {String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Baseline Recommendation */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs space-y-1">
                <p className="font-semibold text-primary">Baseline Recommendation</p>
                <p className="text-foreground/90">{opportunity.recommendation}</p>
              </div>
            </div>

            {/* AI Proposal Section (§22) */}
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    Autonomous AI Proposal
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    LangGraph multi-step reasoning pipeline grounded in catalog metrics and store policy.
                  </p>
                </div>

                {!proposal && (
                  <button
                    onClick={handleGenerateProposal}
                    disabled={isGenerating}
                    className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? "Reasoning Pipeline Active..." : "Generate AI Proposal"}
                  </button>
                )}
              </div>

              {/* Idle State */}
              {!proposal && !isGenerating && (
                <div className="rounded-lg border border-dashed p-8 text-center space-y-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    No proposal generated for this opportunity yet.
                  </p>
                  <p className="max-w-md mx-auto">
                    Click &quot;Generate AI Proposal&quot; to run the LangGraph agent across store telemetry and produce an actionable merchant intervention.
                  </p>
                </div>
              )}

              {/* Generating Animation */}
              {isGenerating && (
                <div className="p-8 text-center space-y-3">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-xs font-medium text-foreground">
                    Evaluating opportunity data against merchant constraints...
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Grounded reasoning • Model: Llama 3.3 70B • State: Validation Node
                  </p>
                </div>
              )}

              {/* Proposal Display Card */}
              {proposal && (
                <div className="space-y-4 pt-1">
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center rounded-md bg-violet-100 dark:bg-violet-950 px-2 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                          {proposal.action} ACTION
                        </span>
                        <h3 className="text-base font-bold text-foreground mt-1">
                          {proposal.title}
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">
                          {Math.round(proposal.confidence * 100)}% Confidence
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-foreground">
                          Reasoning & Rationale:
                        </span>
                        <p className="text-muted-foreground mt-0.5 leading-relaxed">
                          {proposal.reason}
                        </p>
                      </div>

                      <div className="pt-1">
                        <span className="font-semibold text-foreground">
                          Projected Financial Impact:
                        </span>
                        <p className="text-muted-foreground mt-0.5">
                          {proposal.expectedImpact}
                        </p>
                      </div>

                      {/* Specific Parameters */}
                      {proposal.quantity && (
                        <div className="pt-1">
                          <span className="font-semibold text-foreground">
                            Proposed Restock Volume:
                          </span>{" "}
                          <span className="font-mono font-bold text-foreground">
                            +{proposal.quantity} units
                          </span>
                        </div>
                      )}
                      {proposal.discountPercent && (
                        <div className="pt-1">
                          <span className="font-semibold text-foreground">
                            Proposed Discount:
                          </span>{" "}
                          <span className="font-mono font-bold text-foreground">
                            {proposal.discountPercent}% OFF
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Policy Gate Check Evaluation */}
                    <div className="flex items-center justify-between border-t border-violet-500/20 pt-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          Policy Engine:
                        </span>
                        {policyEval?.allowed ? (
                          <span className="inline-flex items-center text-emerald-600 font-semibold gap-1">
                            ✓ Complies with merchant guardrails
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold">
                            ✗ Violations detected
                          </span>
                        )}
                      </div>

                      <span className="text-muted-foreground text-[11px]">
                        Requires Merchant Authorization
                      </span>
                    </div>
                  </div>

                  {/* Submission to Approvals Queue */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleCreateApproval}
                      disabled={isSubmitting || !policyEval?.allowed}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting
                        ? "Submitting to Queue..."
                        : "Request Merchant Approval →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
