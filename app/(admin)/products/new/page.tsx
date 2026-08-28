"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useCreateProduct } from "@/lib/hooks/useCreateProduct";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProductForm, type ProductFormProps, type ProductFormState } from "@/components/admin/ProductForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { typography } from "@/lib/design-tokens";

interface FormState extends ProductFormState {
  sku: string;
  buyingPrice: string;
  sellingPrice: string;
  unit: string;
  stock: string;
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

  return errors;
}

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const createProduct = useCreateProduct();

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createProduct.reset();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

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

  const submitError = createProduct.error
    ? createProduct.error instanceof ApiError
      ? createProduct.error.message
      : "Something went wrong. Please try again."
    : null;

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
                  value={form.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                />
                {errors.sku && <span className="text-sm text-destructive">{errors.sku}</span>}
              </Label>

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
                  <span className="text-sm">Initial stock</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={form.stock}
                    onChange={(e) => updateField("stock", e.target.value)}
                  />
                  {errors.stock && (
                    <span className="text-sm text-destructive">{errors.stock}</span>
                  )}
                </Label>
              </div>

              {submitError && <ErrorState message={submitError} />}

              <Button type="submit" disabled={createProduct.isPending} className="w-fit">
                {createProduct.isPending ? "Creating..." : "Create product"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
