"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  ActorTypeBadge,
  AuditActionBadge,
} from "@/components/audit/audit-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { AuditEvent, AuditResponse } from "@/types/audit";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Database,
} from "lucide-react";

export default function AuditTrailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actorFilter, setActorFilter] = useState<string>("ALL");
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set()
  );

  const fetchAuditEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<AuditResponse>("/audit", {
        params: { limit: 100 },
      });
      setEvents(data.events || []);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load audit events"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchAuditEvents();
    }
  }, [authLoading, fetchAuditEvents]);

  const toggleExpand = (id: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // KPI calculations
  const totalEvents = events.length;
  const aiEvents = events.filter((e) => e.actorType === "AI_AGENT").length;
  const policyEvents = events.filter(
    (e) => e.action === "POLICY_CHECKED"
  ).length;
  const paymentEvents = events.filter((e) =>
    e.action.startsWith("PAYMENT_")
  ).length;

  // Filtering
  const filteredEvents = events.filter((event) => {
    const matchesActor =
      actorFilter === "ALL" || event.actorType === actorFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      event.action.toLowerCase().includes(q) ||
      event.entity.toLowerCase().includes(q) ||
      (event.entityId && event.entityId.toLowerCase().includes(q)) ||
      (event.metadata &&
        JSON.stringify(event.metadata).toLowerCase().includes(q));

    return matchesActor && matchesSearch;
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Audit Trail & AI Trace
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Immutable ledger tracking AI recommendations, merchant decisions, policy checks, and payments
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditEvents}
            disabled={isLoading}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Total Events
              </span>
              <Database className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalEvents}</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                AI Invocations
              </span>
              <Sparkles className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {aiEvents}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Policy Interventions
              </span>
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {policyEvents}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">
                Payment Events
              </span>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {paymentEvents}
            </div>
          </div>
        </div>

        {/* Controls: Actor Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted rounded-lg border border-border self-stretch sm:self-auto">
            {(
              [
                { label: "All Actors", value: "ALL" },
                { label: "Merchant User", value: "USER" },
                { label: "AI Agent", value: "AI_AGENT" },
                { label: "Razorpay Webhook", value: "WEBHOOK" },
                { label: "System Core", value: "SYSTEM" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActorFilter(filter.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  actorFilter === filter.value
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
              placeholder="Search action, entity, payload..."
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
            <Button variant="outline" size="sm" onClick={fetchAuditEvents}>
              Retry
            </Button>
          </div>
        )}

        {/* Events Table / Timeline */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Loading audit trail...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <h3 className="text-base font-medium text-foreground">No events recorded</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery || actorFilter !== "ALL"
                  ? "Try resetting your search query or actor filter."
                  : "All merchant actions, AI evaluations, approvals, and settlements will automatically record here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredEvents.map((event) => {
                const isExpanded = expandedEventIds.has(event.id);
                const hasMetadata =
                  event.metadata && Object.keys(event.metadata).length > 0;

                return (
                  <div
                    key={event.id}
                    className="p-4 hover:bg-muted/30 transition-colors space-y-2 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <AuditActionBadge action={event.action} />
                        <ActorTypeBadge actorType={event.actorType} />
                        <span className="text-muted-foreground">
                          Entity:{" "}
                          <strong className="text-foreground font-semibold">
                            {event.entity}
                          </strong>
                          {event.entityId && (
                            <span className="font-mono text-muted-foreground ml-1">
                              ({event.entityId})
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(event.createdAt)}
                        </span>

                        {hasMetadata && (
                          <button
                            onClick={() => toggleExpand(event.id)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-[11px]"
                          >
                            {isExpanded ? (
                              <>
                                Hide Payload
                                <ChevronDown className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Inspect Payload
                                <ChevronRight className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible JSON Metadata */}
                    {isExpanded && hasMetadata && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <pre className="p-3 bg-muted/70 rounded-md font-mono text-[11px] overflow-x-auto text-foreground border border-border">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
