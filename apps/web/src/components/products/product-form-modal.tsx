"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { ProductResponse, VariantResponse } from "@/types/products";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
}: ProductFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [variantName, setVariantName] = useState("");
  const [sku, setSku] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [quantity, setQuantity] = useState("10");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(priceRupees);
    const qtyNum = parseInt(quantity, 10);

    if (!name.trim() || !variantName.trim() || !sku.trim()) {
      setError("Please fill in all required product and variant details.");
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid positive price.");
      return;
    }

    if (isNaN(qtyNum) || qtyNum < 0) {
      setError("Please enter a valid stock quantity.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create Product
      const productRes = await api.post<ProductResponse>("/products", {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // 2. Create Initial Variant with Inventory
      const priceInPaise = Math.round(priceNum * 100);
      await api.post<VariantResponse>(`/products/${productRes.product.id}/variants`, {
        name: variantName.trim(),
        sku: sku.trim(),
        price: priceInPaise,
        currency: "INR",
        quantity: qtyNum,
      });

      // Reset and close
      setName("");
      setDescription("");
      setVariantName("");
      setSku("");
      setPriceRupees("");
      setQuantity("10");
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to create product"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg space-y-5 my-8">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Add New Product
            </h2>
            <p className="text-xs text-muted-foreground">
              Create a catalog listing with an initial variant and inventory.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">
              Product Title *
            </label>
            <Input
              placeholder="e.g. CloudStrider Carbon Runner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-foreground">
              Description (Optional)
            </label>
            <Input
              placeholder="High performance marathon racing shoe..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
              Initial Variant & Inventory
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Variant Name *
                </label>
                <Input
                  placeholder="e.g. Stealth Black / UK 9"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  SKU (Unique) *
                </label>
                <Input
                  placeholder="e.g. CS-BLK-09"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Price (₹ INR) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="2499.00"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Initial Physical Stock *
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Save Product & Variant"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
