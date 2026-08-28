"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useUpdateVariant } from "@/lib/hooks/useUpdateVariant";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProductImagePicker } from "@/components/admin/ProductImagePicker";
import type { ProductVariant } from "@/lib/types";

interface EditVariantFormState {
  variantName: string;
  sku: string;
  barcode: string;
  buyingPrice: string;
  sellingPrice: string;
  unit: string;
  lowStockThreshold: string;
  trackStock: boolean;
  isActive: boolean;
}

function formStateFromVariant(variant: ProductVariant): EditVariantFormState {
  return {
    variantName: variant.variant_name ?? "",
    sku: variant.sku,
    barcode: variant.barcode ?? "",
    buyingPrice: variant.buying_price,
    sellingPrice: variant.selling_price,
    unit: variant.unit ?? "",
    lowStockThreshold: variant.low_stock_threshold ?? "",
    trackStock: variant.track_stock,
    isActive: variant.is_active,
  };
}

function validate(
  form: EditVariantFormState,
): Partial<Record<keyof EditVariantFormState, string>> {
  const errors: Partial<Record<keyof EditVariantFormState, string>> = {};

  if (!form.variantName.trim()) errors.variantName = "Variant name is required.";
  if (!form.sku.trim()) errors.sku = "SKU is required.";
  if (!form.unit.trim()) errors.unit = "Unit is required.";

  const buyingPrice = Number(form.buyingPrice);
  if (!form.buyingPrice.trim() || !Number.isFinite(buyingPrice) || buyingPrice <= 0) {
    errors.buyingPrice = "Buying price must be a positive number.";
  }

  const sellingPrice = Number(form.sellingPrice);
  if (!form.sellingPrice.trim() || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    errors.sellingPrice = "Selling price must be a positive number.";
  }

  if (form.lowStockThreshold.trim()) {
    const threshold = Number(form.lowStockThreshold);
    if (!Number.isFinite(threshold) || threshold < 0) {
      errors.lowStockThreshold = "Low stock threshold must be zero or a positive number.";
    }
  }

  return errors;
}

interface EditVariantDialogProps {
  productId: string;
  variant: ProductVariant;
}

export function EditVariantDialog({ productId, variant }: EditVariantDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EditVariantFormState>(() => formStateFromVariant(variant));
  const [errors, setErrors] = useState<Partial<Record<keyof EditVariantFormState, string>>>({});
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const updateVariant = useUpdateVariant();

  function updateField<K extends keyof EditVariantFormState>(
    key: K,
    value: EditVariantFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      // Re-seed from the latest variant data every time it opens — it may
      // have changed since the last time (e.g. a previous edit landed).
      setForm(formStateFromVariant(variant));
      setErrors({});
      setPendingImages([]);
      setImagesToDelete([]);
      updateVariant.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateVariant.reset();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      // Always the full field set, not a diff against the original values —
      // the backend explicitly documents that resending an unchanged value
      // (e.g. the variant's own sku) is fine, so there's nothing to gain
      // from tracking which fields actually changed.
      await updateVariant.mutateAsync({
        productId,
        variantId: variant.id,
        data: {
          sku: form.sku.trim(),
          variant_name: form.variantName.trim(),
          barcode: form.barcode.trim() || null,
          unit: form.unit.trim(),
          buying_price: Number(form.buyingPrice),
          selling_price: Number(form.sellingPrice),
          low_stock_threshold: form.lowStockThreshold.trim()
            ? Number(form.lowStockThreshold)
            : null,
          track_stock: form.trackStock,
          is_active: form.isActive,
          images: pendingImages.length > 0 ? pendingImages : undefined,
          remove_image_ids: imagesToDelete.length > 0 ? imagesToDelete : undefined,
        },
      });
      toast.success("Variant updated.");
      setOpen(false);
    } catch {
      // Surfaced via submitError below — a duplicate sku (422) is the
      // expected failure case here, not a bug to handle further.
    }
  }

  const submitError = updateVariant.error
    ? updateVariant.error instanceof ApiError
      ? updateVariant.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" variant="link" size="sm" className="h-auto p-0" />}
      >
        Edit
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit variant</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Label className="flex flex-col items-stretch gap-1">
            <span className="text-sm">Variant name</span>
            <Input
              type="text"
              value={form.variantName}
              onChange={(e) => updateField("variantName", e.target.value)}
            />
            {errors.variantName && (
              <span className="text-sm text-destructive">{errors.variantName}</span>
            )}
          </Label>

          <div className="flex gap-4">
            <Label className="flex flex-1 flex-col items-stretch gap-1">
              <span className="text-sm">SKU</span>
              <Input
                type="text"
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
              />
              {errors.sku && <span className="text-sm text-destructive">{errors.sku}</span>}
            </Label>

            <Label className="flex flex-1 flex-col items-stretch gap-1">
              <span className="text-sm">Barcode</span>
              <Input
                type="text"
                value={form.barcode}
                onChange={(e) => updateField("barcode", e.target.value)}
              />
            </Label>
          </div>

          <div className="flex gap-4">
            <Label className="flex flex-1 flex-col items-stretch gap-1">
              <span className="text-sm">Buying price</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.buyingPrice}
                onChange={(e) => updateField("buyingPrice", e.target.value)}
              />
              {errors.buyingPrice && (
                <span className="text-sm text-destructive">{errors.buyingPrice}</span>
              )}
            </Label>

            <Label className="flex flex-1 flex-col items-stretch gap-1">
              <span className="text-sm">Selling price</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.sellingPrice}
                onChange={(e) => updateField("sellingPrice", e.target.value)}
              />
              {errors.sellingPrice && (
                <span className="text-sm text-destructive">{errors.sellingPrice}</span>
              )}
            </Label>
          </div>

          <div className="flex gap-4">
            <Label className="flex flex-1 flex-col items-stretch gap-1">
              <span className="text-sm">Unit</span>
              <Input
                type="text"
                placeholder="pcs, kg, box..."
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
              />
              {errors.unit && <span className="text-sm text-destructive">{errors.unit}</span>}
            </Label>

            <Label className="flex flex-1 flex-col items-stretch gap-1">
              <span className="text-sm">Low stock threshold</span>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="None"
                value={form.lowStockThreshold}
                onChange={(e) => updateField("lowStockThreshold", e.target.value)}
              />
              {errors.lowStockThreshold && (
                <span className="text-sm text-destructive">{errors.lowStockThreshold}</span>
              )}
            </Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-sm font-normal">
              <Checkbox
                checked={form.trackStock}
                onCheckedChange={(checked) => updateField("trackStock", checked === true)}
              />
              Track stock for this variant
            </Label>
            <Label className="flex items-center gap-1.5 text-sm font-normal">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(checked) => updateField("isActive", checked === true)}
              />
              Active (orderable)
            </Label>
          </div>

          <ProductImagePicker
            title="Variant photos"
            hint="Optional. When this variant has its own photos, the storefront shows them once it's selected; otherwise it falls back to the product's general photos."
            existingImages={variant.images}
            imagesToDelete={imagesToDelete}
            onImagesToDeleteChange={setImagesToDelete}
            pendingFiles={pendingImages}
            onPendingFilesChange={setPendingImages}
          />

          {submitError && <ErrorState message={submitError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateVariant.isPending}>
              {updateVariant.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
