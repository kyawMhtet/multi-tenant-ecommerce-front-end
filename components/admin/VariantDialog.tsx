import { useState } from "react";
import { toast } from "sonner";
import { useCreateVariant } from "@/lib/hooks/useCreateVariant";
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
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { ProductImagePicker } from "@/components/admin/ProductImagePicker";
import {
  DiscountFields,
  discountPayload,
  validateDiscount,
  type DiscountErrors,
  type DiscountFormState,
} from "@/components/admin/DiscountFields";
import { useTenant } from "@/lib/hooks/useTenant";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import {
  PreorderFields,
  preorderDepositPercentValue,
  preorderLeadTimeValue,
  validatePreorderDepositPercent,
  validatePreorderLeadTime,
} from "@/components/admin/PreorderFields";

interface VariantFormState {
  variantName: string;
  sku: string;
  buyingPrice: string;
  sellingPrice: string;
  unit: string;
  stock: string;
  allowPreorder: boolean;
  preorderLeadTimeDays: string;
  preorderDepositPercent: string;
}

const initialVariantForm: VariantFormState = {
  variantName: "",
  sku: "",
  buyingPrice: "",
  sellingPrice: "",
  unit: "",
  stock: "",
  allowPreorder: false,
  // "" is "we don't know yet" — never seeded with a number.
  preorderLeadTimeDays: "",
  preorderDepositPercent: "0",
};

function validateVariant(
  form: VariantFormState,
): Partial<Record<keyof VariantFormState, string>> {
  const errors: Partial<Record<keyof VariantFormState, string>> = {};

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

  const stock = Number(form.stock);
  if (!form.stock.trim() || !Number.isFinite(stock) || stock < 0) {
    errors.stock = "Stock must be zero or a positive number.";
  }

  const leadTimeError = validatePreorderLeadTime(form.preorderLeadTimeDays);
  if (leadTimeError) errors.preorderLeadTimeDays = leadTimeError;

  const depositError = validatePreorderDepositPercent(form.preorderDepositPercent);
  if (depositError) errors.preorderDepositPercent = depositError;

  return errors;
}

export function VariantDialog({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<VariantFormState>(initialVariantForm);
  const [errors, setErrors] = useState<Partial<Record<keyof VariantFormState, string>>>({});
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [discount, setDiscount] = useState<DiscountFormState>({
    type: "percent",
    value: "",
    startsOn: "",
    lastDayOn: "",
  });
  const [discountErrors, setDiscountErrors] = useState<DiscountErrors>({});
  const createVariant = useCreateVariant();
  const { data: tenant } = useTenant();
  const timeZone = tenant?.timezone ?? DEFAULT_TIMEZONE;
  const currency = tenant?.currency ?? null;

  function updateField<K extends keyof VariantFormState>(key: K, value: VariantFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setForm(initialVariantForm);
      setErrors({});
      setPendingImages([]);
      setDiscount({ type: "percent", value: "", startsOn: "", lastDayOn: "" });
      setDiscountErrors({});
      createVariant.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createVariant.reset();

    const validationErrors = validateVariant(form);
    const discountValidation = validateDiscount(discount, false);
    setErrors(validationErrors);
    setDiscountErrors(discountValidation);
    if (Object.keys(validationErrors).length > 0) return;
    if (Object.keys(discountValidation).length > 0) return;

    try {
      await createVariant.mutateAsync({
        productId,
        data: {
          sku: form.sku.trim(),
          variant_name: form.variantName.trim(),
          unit: form.unit.trim(),
          buying_price: Number(form.buyingPrice),
          selling_price: Number(form.sellingPrice),
          current_stock: Number(form.stock),
          allow_preorder: form.allowPreorder,
          preorder_lead_time_days: preorderLeadTimeValue(form.preorderLeadTimeDays),
          preorder_deposit_percent: preorderDepositPercentValue(form.preorderDepositPercent),
          ...discountPayload(discount, timeZone),
          images: pendingImages.length > 0 ? pendingImages : undefined,
        },
      });
      toast.success("Variant added.");
      handleOpenChange(false);
    } catch {
      // Surfaced via the ApiErrorState below — a duplicate sku (422) is the
      // expected failure case here, not a bug to handle further.
    }
  }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" variant="outline" className={controls.buttonSm} />}>
        Add variant
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-6 sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add variant</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

          <Label className="flex flex-col items-stretch gap-1">
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

          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="grid gap-4 sm:grid-cols-2">
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
              <span className="text-sm">Stock</span>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="Units in hand"
                value={form.stock}
                onChange={(e) => updateField("stock", e.target.value)}
                className={controls.input}
              />
              {errors.stock && <span className="text-sm text-destructive">{errors.stock}</span>}
            </Label>
          </div>

          <PreorderFields
            allowPreorder={form.allowPreorder}
            leadTimeDays={form.preorderLeadTimeDays}
            depositPercent={form.preorderDepositPercent}
            onAllowPreorderChange={(value) => updateField("allowPreorder", value)}
            onLeadTimeChange={(value) => updateField("preorderLeadTimeDays", value)}
            onDepositPercentChange={(value) =>
              updateField("preorderDepositPercent", value)
            }
            error={errors.preorderLeadTimeDays}
            depositError={errors.preorderDepositPercent}
          />

          <DiscountFields
            variant={{
              selling_price: form.sellingPrice || "0",
              discount_type: null,
              discount_value: "0",
              discount_starts_at: null,
              discount_ends_at: null,
              discount_active: false,
            }}
            form={discount}
            onChange={setDiscount}
            errors={discountErrors}
            timeZone={timeZone}
            currency={currency}
            onRemove={() => setDiscount({ type: "percent", value: "", startsOn: "", lastDayOn: "" })}
            isRemoving={false}
          />

          <ProductImagePicker
            title="Variant photos"
            hint="Optional — add these only if this variant looks different. With none, the storefront shows the product's general photos."
            pendingFiles={pendingImages}
            onPendingFilesChange={setPendingImages}
          />

          {/* Adding a variant is a catalogue WRITE, so it 402s for a
              read-only shop and for a plan whose preorder feature this
              variant is trying to use — ApiErrorState turns either into an
              upgrade prompt instead of a flat sentence. */}
          <ApiErrorState
            error={createVariant.error}
            fallback="Something went wrong. Please try again."
          />

          <DialogFooter className="-mx-6 -mb-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className={controls.button}>
              Cancel
            </Button>
            <Button type="submit" disabled={createVariant.isPending} className={controls.button}>
              {createVariant.isPending ? "Adding..." : "Add variant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
