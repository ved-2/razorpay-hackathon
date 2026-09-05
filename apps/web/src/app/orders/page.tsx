"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Order, OrdersResponse, OrderStatus } from "@/types/orders";
import {
  ShoppingBag,
  Search,
  ArrowRight,
  RefreshCw,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOrders = useCallback(async () => {
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

      const data = await api.get<OrdersResponse>("/orders", { params });
      setOrders(data.orders || []);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load orders"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, statusFilter]);

  useEffect(() => {
    if (!authLoading) {
      fetchOrders();
    }
  }, [authLoading, fetchOrders]);

  // Derived KPIs
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.status === "PAID");
  const pendingOrders = orders.filter((o) => o.status === "PENDING_PAYMENT");
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");

  const totalSettledRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

  // Search filter
  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    const idMatch = order.id.toLowerCase().includes(q);
    const customerMatch =
      order.customer?.name.toLowerCase().includes(q) ||
      order.customer?.email.toLowerCase().includes(q);
    const itemMatch = order.items.some(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.variantName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
    );

    return idMatch || customerMatch || itemMatch;
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
              Orders & Payments
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track customer purchases, live settlement states, and Razorpay transactions
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={isLoading}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Total Orders</span>
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalOrders}</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Settled Revenue</span>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalSettledRevenue, "INR")}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Awaiting Payment</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingOrders.length}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Cancelled</span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {cancelledOrders.length}
            </div>
          </div>
        </div>

        {/* Controls: Status Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted rounded-lg border border-border self-stretch sm:self-auto">
            {(
              [
                { label: "All Orders", value: "ALL" },
                { label: "Paid", value: "PAID" },
                { label: "Pending", value: "PENDING_PAYMENT" },
                { label: "Cancelled", value: "CANCELLED" },
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
              placeholder="Search by ID, customer, SKU..."
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
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              Retry
            </Button>
          </div>
        )}

        {/* Orders Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <h3 className="text-base font-medium text-foreground">No orders found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try resetting your search query or status filter."
                  : "When customers or AI buyers place orders, they will appear here with live payment verification."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-medium text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="px-5 py-3.5">Order</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Items</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Payment</th>
                    <th className="px-5 py-3.5 text-right">Total</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((order) => {
                    const latestPayment = order.payments?.[0];
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-muted/40 transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-mono text-xs font-semibold text-primary hover:underline"
                          >
                            #{order.id.slice(-8)}
                          </Link>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDateTime(order.createdAt)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-foreground">
                            {order.customer?.name || "Anonymous Customer"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.customer?.email}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs text-foreground max-w-xs truncate">
                            {order.items.map((i) => `${i.productName} (${i.quantity}x)`).join(", ")}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {order.items.reduce((sum, i) => sum + i.quantity, 0)} units total
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <OrderStatusBadge status={order.status} size="sm" />
                        </td>

                        <td className="px-5 py-4">
                          {latestPayment ? (
                            <PaymentStatusBadge
                              status={latestPayment.status}
                              provider={latestPayment.provider}
                              size="sm"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-medium text-foreground">
                          {formatCurrency(order.total, order.currency)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            View
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
