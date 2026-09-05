"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { PolicyEvaluateResponse } from "@/types/ai";
import {
  Settings,
  ShieldCheck,
  Building2,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
} from "lucide-react";

interface MerchantPolicySettings {
  maxDiscountPercent: number;
  maxRestockQuantity: number;
  maxOrderValue: number;
  minConfidence: number;
  approvalRequired: boolean;
}

const DEFAULT_POLICY: MerchantPolicySettings = {
  maxDiscountPercent: 20,
  maxRestockQuantity: 50,
  maxOrderValue: 1000000, // In paise = ₹10,000
  minConfidence: 75,
  approvalRequired: true,
};

export default function SettingsPage() {
  const { merchant } = useAuth();
  const [policy, setPolicy] = useState<MerchantPolicySettings>(DEFAULT_POLICY);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulator state
  const [simDiscount, setSimDiscount] = useState(15);
  const [simQuantity, setSimQuantity] = useState(40);
  const [simConfidence, setSimConfidence] = useState(80);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    allowed: boolean;
    violations: string[];
  } | null>(null);

  // Load from localStorage if present
  useEffect(() => {
    try {
      const stored = localStorage.getItem("commerceos_merchant_policy");
      if (stored) {
        setPolicy(JSON.parse(stored));
      }
    } catch {
      // Use defaults
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(
        "commerceos_merchant_policy",
        JSON.stringify(policy)
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Failed to save settings to storage");
    }
  };

  const handleResetDefaults = () => {
    setPolicy(DEFAULT_POLICY);
    localStorage.removeItem("commerceos_merchant_policy");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRunSimulator = async () => {
    setSimulating(true);
    setSimResult(null);

    try {
      const res = await api.post<PolicyEvaluateResponse>("/policy/evaluate", {
        proposal: {
          action: "RESTOCK",
          title: "Simulator Test Proposal",
          reason: "Testing policy limits against configured thresholds",
          quantity: simQuantity,
          discountPercent: simDiscount,
          expectedImpact: "Simulated impact test",
          confidence: simConfidence / 100,
        },
        policyOverrides: {
          maxDiscountPercent: policy.maxDiscountPercent,
          maxRestockQuantity: policy.maxRestockQuantity,
          maxOrderValue: policy.maxOrderValue,
          minConfidence: policy.minConfidence / 100,
          approvalRequired: policy.approvalRequired,
        },
      });

      setSimResult({
        allowed: res.evaluation.allowed,
        violations: res.evaluation.violations || [],
      });
    } catch (err) {
      alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Simulator request failed"
      );
    } finally {
      setSimulating(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Store Settings & AI Guardrails
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure merchant identity, Razorpay gateway parameters, and autonomous AI policy constraints
          </p>
        </div>

        {/* Save confirmation */}
        {saveSuccess && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Policy guardrail settings updated successfully.</span>
          </div>
        )}

        {/* Store Profile Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Store & Gateway Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                Store Name
              </span>
              <span className="font-semibold text-foreground text-sm">
                {merchant?.name || "Demo Store"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                Merchant Slug
              </span>
              <span className="font-mono text-foreground text-sm">
                {merchant?.slug || "demo-store"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                Merchant ID
              </span>
              <span className="font-mono text-foreground text-xs break-all">
                {merchant?.id || "merch_demo_1"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                Active Payment Gateway
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                Razorpay Standard Checkout (Test Mode)
              </span>
            </div>
          </div>
        </div>

        {/* AI Policy Guardrails Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-500" />
                Autonomous AI Policy Guardrails
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Proposals violating these safety thresholds will be hard-blocked by the policy engine
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaults}
                className="text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Defaults
              </Button>
              <Button size="sm" onClick={handleSave} className="text-xs">
                Save Guardrails
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            {/* Max Discount */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label className="font-medium text-foreground">
                  Max Discount Allowed (%)
                </label>
                <span className="font-bold text-primary">
                  {policy.maxDiscountPercent}%
                </span>
              </div>
              <Input
                type="number"
                min={1}
                max={100}
                value={policy.maxDiscountPercent}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    maxDiscountPercent: Number(e.target.value),
                  })
                }
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                AI cannot propose promotions exceeding this discount cap.
              </p>
            </div>

            {/* Max Restock Quantity */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label className="font-medium text-foreground">
                  Max Restock Units Per Action
                </label>
                <span className="font-bold text-primary">
                  {policy.maxRestockQuantity} Units
                </span>
              </div>
              <Input
                type="number"
                min={1}
                max={5000}
                value={policy.maxRestockQuantity}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    maxRestockQuantity: Number(e.target.value),
                  })
                }
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Cap on inventory quantity added in a single automated restock.
              </p>
            </div>

            {/* Min AI Confidence */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label className="font-medium text-foreground">
                  Minimum AI Confidence Score (%)
                </label>
                <span className="font-bold text-primary">
                  {policy.minConfidence}%
                </span>
              </div>
              <Input
                type="number"
                min={50}
                max={99}
                value={policy.minConfidence}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    minConfidence: Number(e.target.value),
                  })
                }
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Proposals with reasoning confidence below this threshold are rejected.
              </p>
            </div>

            {/* Human in the loop toggle */}
            <div className="space-y-2">
              <label className="font-medium text-foreground text-xs block">
                Human Approval Requirement
              </label>
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/30">
                <input
                  type="checkbox"
                  id="reqApproval"
                  checked={policy.approvalRequired}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      approvalRequired: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="reqApproval" className="text-xs text-foreground cursor-pointer">
                  <strong>Enforce Human-in-the-Loop</strong> (Requires merchant sign-off in Approvals queue)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Policy Engine Simulator Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-cyan-500" />
            Live Policy Engine Simulator
          </h2>
          <p className="text-xs text-muted-foreground">
            Test a sample proposal against your active guardrail constraints to verify engine enforcement
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">
                Sample Discount (%):
              </label>
              <Input
                type="number"
                value={simDiscount}
                onChange={(e) => setSimDiscount(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1">
                Sample Restock Units:
              </label>
              <Input
                type="number"
                value={simQuantity}
                onChange={(e) => setSimQuantity(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1">
                Sample Confidence (%):
              </label>
              <Input
                type="number"
                value={simConfidence}
                onChange={(e) => setSimConfidence(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleRunSimulator}
            disabled={simulating}
            className="flex items-center gap-2 text-xs"
          >
            <Play className="h-3.5 w-3.5" />
            {simulating ? "Evaluating Policy..." : "Run Policy Evaluation"}
          </Button>

          {/* Simulator Result */}
          {simResult && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-2 ${
                simResult.allowed
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {simResult.allowed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>PASSED: Proposal is within merchant guardrails and approved for execution.</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    <span>BLOCKED: Proposal violated policy rules and would be denied.</span>
                  </>
                )}
              </div>

              {simResult.violations.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5 text-[11px] pt-1">
                  {simResult.violations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
