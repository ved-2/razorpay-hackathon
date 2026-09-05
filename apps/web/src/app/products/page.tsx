"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { InventoryBadge } from "@/components/products/inventory-badge";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Product, ProductsResponse } from "@/types/products";

export default function ProductsPage() {
  const { isAuthenticated, isLoading: authLoading, merchant } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick inventory edit state
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [isUpdatingInv, setIsUpdatingInv] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<ProductsResponse>("/products");
      setProducts(data.products || []);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load store products"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchProducts();
    }
  }, [authLoading, fetchProducts]);

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to delete product"
      );
    }
  };

  const handleUpdateInventory = async (variantId: string) => {
    const qty = parseInt(editQty, 10);
    if (isNaN(qty) || qty < 0) return;

    setIsUpdatingInv(true);
    try {
      await api.patch(`/variants/${variantId}/inventory`, { quantity: qty });
      setEditingVariantId(null);
      fetchProducts();
    } catch (err) {
      alert(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to update inventory"
      );
    } finally {
      setIsUpdatingInv(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.variants.some((v) =>
        v.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Product & Inventory Catalog
            </h1>
            <p className="text-sm text-muted-foreground">
              {merchant?.name ? `${merchant.name} Catalog` : "Store Catalog"} • Manage listings, SKUs, and live physical stock.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setIsModalOpen(true)}
              disabled={!isAuthenticated}
            >
              + Add Product
            </Button>
          </div>
        </div>

        {/* Unauthenticated Alert */}
        {!authLoading && !isAuthenticated && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Sign in to manage catalog & inventory
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Authentication is required to create products and adjust inventory levels.
              </p>
            </div>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Search & Actions Filter Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="w-full max-w-sm">
            <Input
              placeholder="Search products by title or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <span className="text-xs text-muted-foreground">
            {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
          </span>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Table of Products */}
        <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
              Loading catalog and inventory levels...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">
                No products found
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "No listings match your search query."
                  : "Add your first product and variant to start selling and activate AI revenue monitoring."}
              </p>
              {!searchQuery && isAuthenticated && (
                <Button
                  onClick={() => setIsModalOpen(true)}
                  size="sm"
                  className="mt-2"
                >
                  Create First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-5 py-3">Product Title</th>
                    <th className="px-5 py-3">Variants / SKUs</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Inventory Health</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Product Name */}
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-foreground text-sm">
                          {product.name}
                        </p>
                        {product.description && (
                          <p className="text-muted-foreground text-[11px] line-clamp-1 mt-0.5">
                            {product.description}
                          </p>
                        )}
                      </td>

                      {/* Variants & SKUs */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2">
                          {product.variants.map((v) => (
                            <div key={v.id}>
                              <p className="font-medium text-foreground">
                                {v.name}
                              </p>
                              <p className="font-mono text-[11px] text-muted-foreground">
                                {v.sku}
                              </p>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 align-top font-semibold text-foreground">
                        <div className="space-y-2">
                          {product.variants.map((v) => (
                            <div key={v.id} className="py-0.5">
                              {formatCurrency(v.price, v.currency || "INR")}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Inventory Telemetry */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2">
                          {product.variants.map((v) => (
                            <div key={v.id}>
                              {editingVariantId === v.id ? (
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <input
                                    type="number"
                                    min="0"
                                    value={editQty}
                                    onChange={(e) => setEditQty(e.target.value)}
                                    className="w-16 h-7 rounded border border-input px-2 text-xs"
                                    placeholder="Qty"
                                  />
                                  <button
                                    onClick={() => handleUpdateInventory(v.id)}
                                    disabled={isUpdatingInv}
                                    className="h-7 px-2 rounded bg-primary text-primary-foreground font-medium text-[11px]"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingVariantId(null)}
                                    className="h-7 px-1.5 text-muted-foreground hover:text-foreground text-[11px]"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <InventoryBadge inventory={v.inventory} />
                                  <button
                                    onClick={() => {
                                      setEditingVariantId(v.id);
                                      setEditQty(String(v.inventory?.quantity ?? 0));
                                    }}
                                    className="text-[11px] text-muted-foreground hover:text-primary underline cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 align-top">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          {product.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 align-top text-right">
                        <button
                          onClick={() =>
                            handleDeleteProduct(product.id, product.name)
                          }
                          className="text-xs text-destructive hover:underline cursor-pointer font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Creation Modal */}
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchProducts}
        />
      </div>
    </DashboardShell>
  );
}
