"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { formatMoney } from "@/lib/currency";
import {
  aggregatePreorderLeadTime,
  aggregateStockStatus,
  preorderWaitText,
} from "@/lib/preorder";
import { storefrontStockLabel, storefrontType } from "@/lib/design-tokens";
import type { StorefrontListProduct, StorefrontProductVariant } from "@/lib/types";
import { cn } from "@/lib/utils";

type StockStatus = StorefrontProductVariant["stock_status"];

function priceLabel(variants: StorefrontProductVariant[], currency: string | null): string {
  const prices = variants.map((v) => Number(v.selling_price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min, currency) : `from ${formatMoney(min, currency)}`;
}

// A pill over the image — amber for the low-stock nudge, sky for preorder
// (orderable, just later), a solid dark chip for sold out (paired with the
// dimmed/desaturated image below).
const STOCK_TAG_CLASS: Record<Exclude<StockStatus, "in_stock">, string> = {
  low_stock: "bg-amber-100 text-amber-900",
  preorder: "bg-sky-100 text-sky-900",
  out_of_stock: "bg-storefront-ink text-storefront-bg",
};

interface ProductCardProps {
  product: StorefrontListProduct;
  // The shop's ISO currency code. List items carry no `shop` key (the home
  // page already fetched it once), so the grid threads it down from there.
  currency: string | null;
  // Staggered entrance — capped by the caller so late rows don't wait.
  index?: number;
}

export function ProductCard({ product, currency, index = 0 }: ProductCardProps) {
  const { addLine, openCart } = useCart();

  // The backend guarantees every list product has at least one active
  // variant, so variants[0] is always present. Its slug is the product's
  // canonical link — the product page carries the variant switcher.
  const firstVariant = product.variants[0];
  // Prefer the product's general cover; fall back to the first variant photo
  // for products that only have per-variant images.
  const cover =
    product.images[0] ?? product.variants.find((v) => v.images.length > 0)?.images[0];
  const status = aggregateStockStatus(product.variants);
  const isOutOfStock = status === "out_of_stock";
  // The wait only exists for a product whose buyable options are all
  // preorders; an in-stock product never advertises one.
  const preorderWait =
    status === "preorder" ? preorderWaitText(aggregatePreorderLeadTime(product.variants)) : null;

  // Quick-add only makes sense when there's a single variant and it's
  // buyable — anything with options sends the customer to the product page
  // to choose first. Preorder counts as buyable.
  const canQuickAdd =
    product.variants.length === 1 && firstVariant.stock_status !== "out_of_stock";

  function handleQuickAdd() {
    addLine(
      {
        variantSlug: firstVariant.slug,
        productName: product.name,
        variantLabel: null,
        unitPrice: firstVariant.selling_price,
        currency,
        imageUrl: (firstVariant.images[0] ?? cover)?.url ?? null,
        stockStatus: firstVariant.stock_status,
        preorderLeadTimeDays: firstVariant.preorder_lead_time_days,
        preorderRequiresPrepayment: firstVariant.preorder_requires_prepayment,
      },
      1,
    );
    openCart();
  }

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 7) * 55}ms` }}
      className="group animate-in fade-in slide-in-from-bottom-3 fill-mode-both relative flex flex-col duration-500"
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-md bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- images[].url is already a full URL from the backend
          <img
            src={cover.url}
            alt={product.name}
            loading="lazy"
            className={cn(
              "absolute inset-0 size-full object-cover transition-transform duration-600 ease-out group-hover:scale-104",
              isOutOfStock && "opacity-55 grayscale",
            )}
          />
        ) : (
          <div className={cn(storefrontType.wordmark, "grid size-full place-items-center text-muted-foreground/40")}>
            {product.name.slice(0, 1)}
          </div>
        )}

        {status !== "in_stock" && (
          <span
            className={cn(
              "absolute left-2.5 top-2.5 rounded-full px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] shadow-sm",
              STOCK_TAG_CLASS[status],
            )}
          >
            {storefrontStockLabel[status]}
          </span>
        )}

        {canQuickAdd && (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Add ${product.name} to cart`}
            className="absolute bottom-2.5 right-2.5 z-10 grid size-9 place-items-center rounded-full bg-storefront-ink text-storefront-bg shadow-md transition hover:scale-105 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5 pt-3">
        <h3 className={cn(storefrontType.productName, "text-storefront-ink")}>
          <Link
            // prefetch={false}: a growing list of links to a dynamic route
            // ("Load more" keeps adding cards) — Next's guidance for lists this shape.
            prefetch={false}
            href={`/${firstVariant.slug}`}
            className="underline-offset-4 after:absolute after:inset-0 group-hover:underline"
          >
            {product.name}
          </Link>
        </h3>
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn(storefrontType.price, "text-storefront-ink")}>
            {priceLabel(product.variants, currency)}
          </span>
          {product.variants.length > 1 && (
            <span className="text-xs text-muted-foreground">{product.variants.length} options</span>
          )}
        </div>
        {preorderWait && (
          <span className="text-xs font-medium text-sky-700">{preorderWait}</span>
        )}
      </div>
    </article>
  );
}
