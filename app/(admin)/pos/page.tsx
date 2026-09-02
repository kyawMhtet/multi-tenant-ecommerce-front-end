"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImageOff, PackageSearch, SearchX } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useProducts } from "@/lib/hooks/useProducts";
import { useCreateOrder } from "@/lib/hooks/useCreateOrder";
import type { Order, Product, ProductVariant } from "@/lib/types";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { POSCart, type CartLine } from "@/components/admin/POSCart";
import { ReceiptView } from "@/components/admin/ReceiptView";
import { VariantPickerDialog } from "@/components/admin/VariantPickerDialog";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { controls, stockStatusStyles } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// A single price for a one-variant product, a min–max range otherwise —
// same idea as the admin products list's variantSummary.
function tileSubtitle(product: Product): string {
  const prices = product.variants.map((v) => Number(v.selling_price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? priceFormatter.format(min)
    : `${priceFormatter.format(min)} – ${priceFormatter.format(max)}`;
}

function POSTileGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="flex flex-col gap-1.5 p-2.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PosPage() {
  // NB: this hits the same unpaginated first-page call as the products
  // list screen — a shop with more than one page of products won't be
  // fully searchable here yet. No search endpoint exists to call instead
  // (see the categories precedent above), so this is a known MVP gap,
  // not an oversight.
  const { data: products, isPending, error: loadErrorObj } = useProducts();
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const createOrder = useCreateOrder();

  const loadError = loadErrorObj
    ? loadErrorObj instanceof ApiError
      ? loadErrorObj.message
      : "Could not load products."
    : null;

  // One tile per product, not per variant — a product with more than one
  // variant opens VariantPickerDialog instead of being added directly (see
  // handleTileClick). A product with no variants at all has nothing
  // purchasable, so it's dropped here rather than rendered as a dead tile.
  // Search matches at the product level (name) or any of its variants'
  // sku/barcode/variant_name — a scanner feeding a barcode into this box
  // still surfaces the right product even though the tile itself doesn't
  // show variant-level detail until opened.
  const filteredProducts: Product[] = useMemo(() => {
    if (!products) return [];
    const sellable = products.filter((product) => product.variants.length > 0);

    const query = search.trim().toLowerCase();
    if (!query) return sellable;

    return sellable.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.variants.some(
          (variant) =>
            variant.sku.toLowerCase().includes(query) ||
            variant.barcode?.toLowerCase().includes(query) ||
            variant.variant_name?.toLowerCase().includes(query),
        ),
    );
  }, [products, search]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, line) => sum + Number(line.variant.selling_price) * line.quantity,
        0,
      ),
    [cart],
  );

  function addToCart(product: Product, variant: ProductVariant) {
    setCart((prev) => {
      const existing = prev.find((line) => line.variant.id === variant.id);
      if (existing) {
        return prev.map((line) =>
          line.variant.id === variant.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
  }

  // Single-variant products skip the picker entirely — no unnecessary
  // extra click for the common case of a simple, non-variant product.
  function handleTileClick(product: Product) {
    if (product.variants.length === 1) {
      addToCart(product, product.variants[0]!);
    } else {
      setPickerProduct(product);
    }
  }

  function handleSelectVariant(product: Product, variant: ProductVariant) {
    addToCart(product, variant);
    setPickerProduct(null);
  }

  function updateQuantity(variantId: number, quantity: number) {
    setCart((prev) =>
      prev.map((line) =>
        line.variant.id === variantId
          ? { ...line, quantity: Math.max(1, Math.floor(quantity) || 1) }
          : line,
      ),
    );
  }

  function removeLine(variantId: number) {
    setCart((prev) => prev.filter((line) => line.variant.id !== variantId));
  }

  async function handleCheckout() {
    if (cart.length === 0) return;

    createOrder.reset();

    try {
      const newOrder = await createOrder.mutateAsync({
        items: cart.map((line) => ({
          product_variant_id: line.variant.id,
          quantity: line.quantity,
        })),
        payment_method: "cash",
      });

      setOrder(newOrder);
      setCart([]);
    } catch {
      // Surfaced via checkoutError below — InsufficientStockException::
      // render() only ever returns { message }, no structured fields for
      // the failing variant/qty — verified against the Laravel source, not
      // assumed. The message itself already names the SKU and the
      // requested vs. available quantity ("Insufficient stock for variant
      // [SKU]: requested 5, have 2."), so it's shown as-is rather than
      // parsed into separate fields; regex-matching a human-readable
      // sentence for business logic would silently break the moment that
      // string is reworded.
    }
  }

  const checkoutError = createOrder.error
    ? createOrder.error instanceof ApiError
      ? createOrder.error.message
      : "Something went wrong. Please try again."
    : null;

  function startNewSale() {
    setOrder(null);
    createOrder.reset();
  }

  if (order) {
    return (
      <PageContainer size="md">
        <ReceiptView order={order} onNewSale={startNewSale} />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="full">
      <div className="flex flex-col items-start gap-6 md:flex-row">
        <section className="flex flex-1 flex-col gap-4">
          <PageHeader title="Checkout" />

          {/* Same field as the products list — on a POS the search box is
              the whole interface, so it gets the shared 44px treatment
              rather than a hand-rolled one that drifts from it. */}
          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search products to sell"
            placeholder="Search by name, SKU, or barcode…"
          />

          {loadError && <ErrorState message={loadError} />}

          {!loadError && isPending && <POSTileGridSkeleton />}

          {/* Two different nothings: a search that matched none of the
              shop's products, vs. a shop with nothing sellable yet (no
              products, or none with a variant to ring up). The old copy
              collapsed both into `No products match ""`, which is what an
              empty search box produced. */}
          {products !== undefined && filteredProducts.length === 0 && (
            search.trim() ? (
              <EmptyState
                icon={SearchX}
                title={`No products match "${search.trim()}"`}
                description="Check the spelling, or try a SKU or barcode instead."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSearch("")}
                    className={controls.button}
                  >
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={PackageSearch}
                title="Nothing to sell yet"
                description="Products need at least one variant with a price before they can be rung up here."
                action={
                  <Link href="/products/new" className={cn(buttonVariants(), controls.button)}>
                    Add a product
                  </Link>
                }
              />
            )
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const isSingleVariant = product.variants.length === 1;
              const isFullyOutOfStock = product.variants.every(
                (v) => v.track_stock && Number(v.current_stock) <= 0,
              );
              const cover = product.images[0];

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={isFullyOutOfStock}
                  onClick={() => handleTileClick(product)}
                  className={cn(
                    "flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all",
                    "hover:border-primary/50 hover:shadow-md active:scale-[0.98]",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {/* min-h-0 is load-bearing, not decorative: without it, a
                      tall source image's intrinsic size can force this box
                      taller than its aspect-square, breaking every tile's
                      height uniformity across the grid — object-cover alone
                      only crops once the box is already sized correctly. */}
                  <div className="aspect-square min-h-0 w-full overflow-hidden bg-muted">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- images[].url is already a full URL from the backend, next/image doesn't apply
                      <img src={cover.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                    <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {isSingleVariant
                        ? (product.variants[0]!.variant_name ?? "")
                        : `${product.variants.length} variants`}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-1.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {tileSubtitle(product)}
                      </span>
                      {isFullyOutOfStock && (
                        <Badge
                          variant="outline"
                          className={stockStatusStyles.out_of_stock.badgeClassName}
                        >
                          Out
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <POSCart
          cart={cart}
          subtotal={subtotal}
          onUpdateQuantity={updateQuantity}
          onRemoveLine={removeLine}
          onCheckout={handleCheckout}
          isPending={createOrder.isPending}
          error={checkoutError}
        />

        <VariantPickerDialog
          product={pickerProduct}
          onOpenChange={(open) => {
            if (!open) setPickerProduct(null);
          }}
          onSelectVariant={handleSelectVariant}
        />
      </div>
    </PageContainer>
  );
}
