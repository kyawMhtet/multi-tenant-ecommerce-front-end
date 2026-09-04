"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { getStoredTenantSlug } from "@/lib/auth";
import { useProduct } from "@/lib/hooks/useProduct";
import { useUpdateProduct } from "@/lib/hooks/useUpdateProduct";
import { useRole } from "@/lib/hooks/useRole";
import { useTenant } from "@/lib/hooks/useTenant";
import { discountValueLabel, discountWindowLabel } from "@/lib/discount";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import type { ProductVariant } from "@/lib/types";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { RoleRequiredNotice } from "@/components/admin/RoleRequiredNotice";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ProductForm, type ProductFormState } from "@/components/admin/ProductForm";
import { VariantDialog } from "@/components/admin/VariantDialog";
import { EditVariantDialog } from "@/components/admin/EditVariantDialog";
import { DiscountBadge } from "@/components/admin/DiscountBadge";
import { VariantPrice } from "@/components/admin/VariantPrice";
import { RestockDialog } from "@/components/admin/RestockDialog";
import { BackorderBadge } from "@/components/admin/BackorderBadge";
import { backorderedUnits } from "@/lib/stock";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function validateProduct(
  form: ProductFormState,
): Partial<Record<keyof ProductFormState, string>> {
  const errors: Partial<Record<keyof ProductFormState, string>> = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  return errors;
}

function EditProductSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-16" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3.5 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>

      <TableCard title="Variants">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableSkeleton columns={6} rows={3} />
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: product, error: loadErrorObj } = useProduct(id);
  const updateProduct = useUpdateProduct();
  const { canManage } = useRole();
  // A promotion's window is stored in UTC and meant in the shop's zone —
  // rendering it anywhere else moves a midnight boundary across a day.
  const { data: tenant } = useTenant();
  const timeZone = tenant?.timezone ?? DEFAULT_TIMEZONE;


  const [form, setForm] = useState<ProductFormState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormState, string>>>({});
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

  // Seeds the editable form the first time this product's data arrives, and
  // again only if the page switches to a different product.
  //
  // Deliberately keyed on the id, and deliberately not an effect keyed on
  // `product`: React Query hands back a fresh object on every background
  // refetch (window refocus, or the invalidation any mutation fires), and an
  // effect watching `product` re-seeded on each one — silently wiping out
  // whatever the user had typed since. Tabbing away mid-edit and back was
  // enough to lose the changes. Comparing ids instead means a refetch of the
  // same product leaves the form alone.
  const [seededProductId, setSeededProductId] = useState<number | null>(null);
  if (product && product.id !== seededProductId) {
    setSeededProductId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      categoryId: product.category_id,
      isActive: product.is_active,
    });
  }

  function updateField<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  // {tenant-slug}.{host}/{variant-slug} — the tenant slug comes from
  // localStorage (stashed at login from AuthUser.tenant_slug), not from
  // this page's own URL, since the admin app has no subdomain to read one
  // from (see proxy.ts). Null when that hasn't been captured yet (e.g. a
  // session from before this field existed — logging out and back in
  // fixes it).
  function storefrontUrl(variantSlug: string): string | null {
    const tenantSlug = getStoredTenantSlug();
    if (!tenantSlug) return null;
    return `${window.location.protocol}//${tenantSlug}.${window.location.host}/${variantSlug}`;
  }

  async function handleCopyLink(variant: ProductVariant) {
    if (!variant.slug) return;
    const url = storefrontUrl(variant.slug);
    if (!url) return;

    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;

    updateProduct.reset();

    const validationErrors = validateProduct(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      // Field edits, new images, and removals all go in this one request,
      // processed in one transaction on the backend — it's all-or-nothing,
      // so there's nothing partial to reconcile here: either everything
      // below gets cleared because it all really happened, or the catch
      // below fires and none of it did.
      await updateProduct.mutateAsync({
        id,
        data: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          category_id: form.categoryId ?? undefined,
          is_active: form.isActive,
          images: pendingImages.length > 0 ? pendingImages : undefined,
          remove_image_ids: imagesToDelete.length > 0 ? imagesToDelete : undefined,
        },
      });
      setPendingImages([]);
      setImagesToDelete([]);
      toast.success("Saved.");
      router.push("/products");
    } catch {
      // Surfaced via updateProduct.error below.
    }
  }


  if (!canManage) {
    return (
      <PageContainer size="lg">
        <div className="flex flex-col gap-6">
          <PageHeader title="Product" backHref="/products" backLabel="Back to products" />
          <RoleRequiredNotice minimum="manager" />
        </div>
      </PageContainer>
    );
  }

  if (loadErrorObj) {
    return (
      <PageContainer size="lg">
        <div className="flex flex-col gap-6">
          <PageHeader title="Edit product" backHref="/products" backLabel="Back to products" />
          <ApiErrorState error={loadErrorObj} fallback="Could not load product." />
        </div>
      </PageContainer>
    );
  }

  if (!product || !form) {
    return (
      <PageContainer size="lg">
        <div className="flex flex-col gap-6">
          <PageHeader title="Edit product" backHref="/products" backLabel="Back to products" />
          <EditProductSkeleton />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <PageHeader title="Edit product" backHref="/products" backLabel="Back to products" />

          <Card className="shadow-sm">
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <ProductForm
                  form={form}
                  errors={errors}
                  onFieldChange={updateField}
                  existingImages={product.images}
                  imagesToDelete={imagesToDelete}
                  onImagesToDeleteChange={setImagesToDelete}
                  pendingImages={pendingImages}
                  onPendingImagesChange={setPendingImages}
                  showActiveToggle
                />

                <ApiErrorState
                  error={updateProduct.error}
                  fallback="Something went wrong. Please try again."
                />

                <Button type="submit" disabled={updateProduct.isPending} className={cn(controls.button, "w-fit")}>
                  {updateProduct.isPending ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <TableCard title="Variants" action={<VariantDialog productId={id} />}>
          {product.variants.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={Layers}
              title="No variants yet"
              description="Add a variant to give this product a price, SKU, and stock count."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead />
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map((variant) => {
                  const discountWindow = discountWindowLabel(variant, timeZone);

                  return (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2.5">
                        {variant.images.length > 0 && (
                          // eslint-disable-next-line @next/next/no-img-element -- external per-tenant image host, next/image doesn't apply
                          <img
                            src={variant.images[0].url}
                            alt=""
                            title={`${variant.images.length} dedicated photo${variant.images.length > 1 ? "s" : ""}`}
                            className="size-8 shrink-0 rounded-md object-cover ring-1 ring-border"
                          />
                        )}
                        {variant.variant_name ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{variant.sku}</TableCell>
                    {/* The live price with the list price struck through, and
                        the promotion's own state beside it — "Scheduled" is a
                        different thing from "On sale" and a variant showing
                        one must never read as the other. */}
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <VariantPrice variant={variant} />
                        <DiscountBadge
                          variant={variant}
                          detail={
                            variant.discount_type
                              ? discountValueLabel(
                                  variant.discount_type,
                                  variant.discount_value,
                                  tenant?.currency,
                                )
                              : null
                          }
                        />
                      </div>
                      {/* When it runs, on the shop's clock — the end shown as
                          the last day it runs, never the exclusive boundary
                          the API actually stores. */}
                      {discountWindow && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {discountWindow}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Shown as-is, negatives included: -7 is what the
                            shop sold past zero, and rounding it up to 0
                            would hide the seven units it owes. */}
                        <span className="tabular-nums">{Number(variant.current_stock)}</span>
                        <BackorderBadge units={backorderedUnits(variant.current_stock)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <EditVariantDialog productId={id} variant={variant} />
                        {/* Restocking a track_stock: false variant is a
                            guaranteed 422 server-side (StoreRestockRequest
                            rejects it explicitly) — not offered here rather
                            than shown as an action that can't succeed. */}
                        {variant.track_stock && (
                          <RestockDialog productId={id} variant={variant} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {!variant.slug ? (
                        <span className="text-muted-foreground">No link</span>
                      ) : storefrontUrl(variant.slug) ? (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => handleCopyLink(variant)}
                        >
                          Copy link
                        </Button>
                      ) : (
                        <span
                          className="text-muted-foreground"
                          title="Your session doesn't have a tenant slug stored — log out and back in to fix this."
                        >
                          Log in again for link
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TableCard>
      </div>
    </PageContainer>
  );
}
