"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { controls } from "@/lib/design-tokens";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { ProductImagePicker } from "@/components/admin/ProductImagePicker";
import {
  PreorderFields,
  preorderLeadTimeValue,
  validatePreorderLeadTime,
} from "@/components/admin/PreorderFields";
import { BackorderBadge } from "@/components/admin/BackorderBadge";
import { backorderedUnits } from "@/lib/stock";
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
  allowPreorder: boolean;
  preorderLeadTimeDays: string;
  preorderRequiresPrepayment: boolean;
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
    allowPreorder: variant.allow_preorder,
    // null ("no estimate") becomes "", which is exactly what the input
    // shows for it — and what turns back into null on the way out.
    preorderLeadTimeDays:
      variant.preorder_lead_time_days === null ? "" : String(variant.preorder_lead_time_days),
    preorderRequiresPrepayment: variant.preorder_requires_prepayment,
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

  const leadTimeError = validatePreorderLeadTime(form.preorderLeadTimeDays);
  if (leadTimeError) errors.preorderLeadTimeDays = leadTimeError;

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
          allow_preorder: form.allowPreorder,
          // Sent whatever the checkbox says: the estimate survives preorder
          // being switched off, so switching it back on doesn't lose it.
          preorder_lead_time_days: preorderLeadTimeValue(form.preorderLeadTimeDays),
          preorder_requires_prepayment: form.preorderRequiresPrepayment,
          is_active: form.isActive,
          images: pendingImages.length > 0 ? pendingImages : undefined,
          remove_image_ids: imagesToDelete.length > 0 ? imagesToDelete : undefined,
        },
      });
      toast.success("Variant updated.");
      setOpen(false);
    } catch {
      // Surfaced via the ApiErrorState below — a duplicate sku (422) is the
      // expected failure case here, not a bug to handle further.
    }
  }


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
              placeholder="Red / Large"
              value={form.variantName}
              onChange={(e) => updateField("variantName", e.target.value)}
              className={controls.input}
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
                placeholder="TSHIRT-RED-L"
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                className={controls.input}
              />
              {errors.sku && <span className="text-sm text-destructive">{errors.sku}</span>}
            </Label>

            <Label className="flex flex-1 flex-col items-stretch gap-1">
              <span className="text-sm">Barcode</span>
              <Input
                type="text"
                placeholder="8850123456789"
                value={form.barcode}
                onChange={(e) => updateField("barcode", e.target.value)}
                className={controls.input}
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
                placeholder="What you paid"
                value={form.buyingPrice}
                onChange={(e) => updateField("buyingPrice", e.target.value)}
                className={controls.input}
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
                placeholder="What you charge"
                value={form.sellingPrice}
                onChange={(e) => updateField("sellingPrice", e.target.value)}
                className={controls.input}
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
                className={controls.input}
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
                className={controls.input}
              />
              {errors.lowStockThreshold && (
                <span className="text-sm text-destructive">{errors.lowStockThreshold}</span>
              )}
            </Label>
          </div>

          <PreorderFields
            allowPreorder={form.allowPreorder}
            leadTimeDays={form.preorderLeadTimeDays}
            requiresPrepayment={form.preorderRequiresPrepayment}
            onAllowPreorderChange={(value) => updateField("allowPreorder", value)}
            onLeadTimeChange={(value) => updateField("preorderLeadTimeDays", value)}
            onRequiresPrepaymentChange={(value) =>
              updateField("preorderRequiresPrepayment", value)
            }
            error={errors.preorderLeadTimeDays}
          />

          {/* What preorder has already cost this variant, where the shop is
              deciding whether to keep it on. */}
          {backorderedUnits(variant.current_stock) > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BackorderBadge units={backorderedUnits(variant.current_stock)} />
              already sold and owed to customers.
            </div>
          )}

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

          <ApiErrorState
            error={updateVariant.error}
            fallback="Something went wrong. Please try again."
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className={controls.button}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateVariant.isPending} className={controls.button}>
              {updateVariant.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
