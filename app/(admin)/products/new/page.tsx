"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateProduct } from "@/lib/hooks/useCreateProduct";
import { useRole } from "@/lib/hooks/useRole";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { RoleRequiredNotice } from "@/components/admin/RoleRequiredNotice";
import { ProductForm, type ProductFormProps, type ProductFormState } from "@/components/admin/ProductForm";
import {
  PreorderFields,
  preorderDepositPercentValue,
  preorderLeadTimeValue,
  validatePreorderDepositPercent,
  validatePreorderLeadTime,
} from "@/components/admin/PreorderFields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { controls, typography } from "@/lib/design-tokens";
import {
  DiscountFields,
  discountPayload,
  validateDiscount,
  type DiscountErrors,
  type DiscountFormState,
} from "@/components/admin/DiscountFields";
import { useTenant } from "@/lib/hooks/useTenant";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";

interface FormState extends ProductFormState {
  sku: string;
  buyingPrice: string;
  sellingPrice: string;
  unit: string;
  stock: string;
  allowPreorder: boolean;
  preorderLeadTimeDays: string;
  preorderDepositPercent: string;
}

const initialForm: FormState = {
  name: "",
  description: "",
  categoryId: null,
  // Not editable on create (a new product is always active); carried only
  // to satisfy ProductFormState. The create request never sends it.
  isActive: true,
  sku: "",
  buyingPrice: "",
  sellingPrice: "",
  unit: "",
  stock: "",
  allowPreorder: false,
  preorderLeadTimeDays: "",
  preorderDepositPercent: "0",
};

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (!form.name.trim()) errors.name = "Name is required.";
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
    errors.stock = "Initial stock must be zero or a positive number.";
  }

  const leadTimeError = validatePreorderLeadTime(form.preorderLeadTimeDays);
  if (leadTimeError) errors.preorderLeadTimeDays = leadTimeError;

  const depositError = validatePreorderDepositPercent(form.preorderDepositPercent);
  if (depositError) errors.preorderDepositPercent = depositError;

  return errors;
}

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [discount, setDiscount] = useState<DiscountFormState>({
    type: "percent",
    value: "",
    startsOn: "",
    lastDayOn: "",
  });
  const [discountErrors, setDiscountErrors] = useState<DiscountErrors>({});
  const createProduct = useCreateProduct();
  const { canManage } = useRole();
  const { data: tenant } = useTenant();
  const timeZone = tenant?.timezone ?? DEFAULT_TIMEZONE;
  const currency = tenant?.currency ?? null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createProduct.reset();

    const validationErrors = validate(form);
    const discountValidation = validateDiscount(discount, false);
    setErrors(validationErrors);
    setDiscountErrors(discountValidation);
    if (Object.keys(validationErrors).length > 0) return;
    if (Object.keys(discountValidation).length > 0) return;

    try {
      await createProduct.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || null,
        category_id: form.categoryId,
        variant: {
          sku: form.sku.trim(),
          buying_price: Number(form.buyingPrice),
          selling_price: Number(form.sellingPrice),
          unit: form.unit.trim(),
          current_stock: Number(form.stock),
          allow_preorder: form.allowPreorder,
          preorder_lead_time_days: preorderLeadTimeValue(form.preorderLeadTimeDays),
          preorder_deposit_percent: preorderDepositPercentValue(form.preorderDepositPercent),
          ...discountPayload(discount, timeZone),
        },
        images: pendingImages,
      });
      toast.success("Product created.");
      router.push("/products");
    } catch {
      // Surfaced via createProduct.error below — mutateAsync rejecting here
      // is the expected path, not a bug to handle further.
    }
  }


  if (!canManage) {
    return (
      <PageContainer size="lg">
        <div className="flex flex-col gap-6">
          <PageHeader title="Add product" backHref="/products" backLabel="Back to products" />
          <RoleRequiredNotice minimum="manager" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg">
      <div className="flex flex-col gap-6">
        <PageHeader title="Add product" backHref="/products" backLabel="Back to products" />

        <Card className="shadow-sm">
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <ProductForm
                form={form}
                errors={errors}
                // updateField is generic over keyof FormState (a superset of
                // ProductFormState's keys, since FormState extends it) — it
                // genuinely handles every key ProductForm can call it with,
                // but TS's indexed-access generic checking can't verify that
                // across differing type-parameter constraints on its own.
                onFieldChange={updateField as ProductFormProps["onFieldChange"]}
                pendingImages={pendingImages}
                onPendingImagesChange={setPendingImages}
              />

              <Separator className="my-2" />
              <p className={typography.muted}>Price &amp; stock</p>

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

              {/*
                Money placeholders name the side of the trade, never an amount.
                An example figure would be wrong in one of the two currencies
                this is sold in (4500 reads as a fair price in MMK and an absurd
                one in THB), and — as in PreorderFields — a placeholder that
                reads as a value is how a made-up number gets accepted as real.
                "Buying"/"selling" is also the jargon a first-time shop owner
                most often has backwards, so plain wording earns its place here.
              */}
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
                  <span className="text-sm">Initial stock</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Units in hand"
                    value={form.stock}
                    onChange={(e) => updateField("stock", e.target.value)}
                    className={controls.input}
                  />
                  {errors.stock && (
                    <span className="text-sm text-destructive">{errors.stock}</span>
                  )}
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

              {/* Creating a product is the one write most likely to meet a
                  402: it's blocked outright for a read-only shop, and it's
                  where plan_limit_exceeded fires when a Starter shop hits its
                  50th product. Both need the route to billing, not a dead
                  end. Note the shop keeps every product it already has —
                  only creating more is refused. */}
              <ApiErrorState
                error={createProduct.error}
                fallback="Something went wrong. Please try again."
              />

              <Button type="submit" disabled={createProduct.isPending} className={cn(controls.button, "w-fit")}>
                {createProduct.isPending ? "Creating..." : "Create product"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
