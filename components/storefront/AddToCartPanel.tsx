"use client";

import { useState } from "react";
import { CalendarClock, Check, ShieldCheck } from "lucide-react";
import { StockBadge } from "@/components/shared/StockBadge";
import { QuantityStepper } from "@/components/storefront/QuantityStepper";
import { useCart } from "@/components/storefront/CartProvider";
import { formatMoney } from "@/lib/currency";
import { depositText, preorderWaitText } from "@/lib/preorder";
import { storefrontStockLabel, storefrontType } from "@/lib/design-tokens";
import type { StorefrontProduct, StorefrontProductVariant } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AddToCartPanelProps {
  product: StorefrontProduct;
  selectedVariant: StorefrontProductVariant;
  onSelectVariant: (slug: string) => void;
}

function variantLabel(variant: StorefrontProductVariant): string {
  return variant.variant_name ?? variant.unit ?? "Option";
}

export function AddToCartPanel({ product, selectedVariant, onSelectVariant }: AddToCartPanelProps) {
  const { addLine, openCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const currency = product.shop.currency;
  // Only out_of_stock blocks a sale — preorder is buyable, just later.
  const isOutOfStock = selectedVariant.stock_status === "out_of_stock";
  const isLowStock = selectedVariant.stock_status === "low_stock";
  const isPreorder = selectedVariant.stock_status === "preorder";
  const salePrice = selectedVariant.sale_price;
  // Said here as well as at checkout, where it's actually enforced: someone
  // who only ever pays cash on delivery should find that out while deciding,
  // not after they've filled in their address. Null unless the variant is
  // actually on preorder, so an in-stock item can never show a deposit.
  const deposit = isPreorder ? depositText(selectedVariant.preorder_deposit_percent) : null;
  const hasOtherOptions = product.variants.length > 1;

  function handleAddToCart() {
    // out_of_stock is blocked here, not left for checkout to reject.
    if (isOutOfStock) return;

    addLine(
      {
        variantSlug: selectedVariant.slug,
        productName: product.name,
        variantLabel: hasOtherOptions ? variantLabel(selectedVariant) : null,
        unitPrice: salePrice ?? selectedVariant.selling_price,
        currency,
        // The variant's own cover if it has one, else the product's — same
        // precedence as the gallery.
        imageUrl: (selectedVariant.images[0] ?? product.images[0])?.url ?? null,
        stockStatus: selectedVariant.stock_status,
        preorderLeadTimeDays: selectedVariant.preorder_lead_time_days,
        preorderDepositPercent: selectedVariant.preorder_deposit_percent,
      },
      Math.max(1, Math.floor(quantity)),
    );
    openCart();
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Price ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-black/10 pt-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className={cn(storefrontType.priceLarge, "text-storefront-ink")}>
            {formatMoney(salePrice ?? selectedVariant.selling_price, currency)}
          </span>
          {salePrice !== null && (
            <span className="text-sm text-muted-foreground line-through">
              {formatMoney(selectedVariant.selling_price, currency)}
            </span>
          )}
          {selectedVariant.discount_percent !== null && selectedVariant.discount_percent > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-1 text-[0.625rem] font-bold tracking-[0.06em] text-rose-800 uppercase">
              {selectedVariant.discount_percent}% off
            </span>
          )}
        </div>
        <StockBadge
          status={selectedVariant.stock_status}
          label={storefrontStockLabel[selectedVariant.stock_status]}
        />
      </div>

      {/* Options -------------------------------------------------------- */}
      {hasOtherOptions && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className={cn(storefrontType.navLabel, "text-muted-foreground")}>Option</span>
            <span className="text-sm font-medium text-storefront-ink">
              {variantLabel(selectedVariant)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {product.variants.map((variant) => {
              const isSelected = variant.slug === selectedVariant.slug;
              const soldOut = variant.stock_status === "out_of_stock";
              return (
                <button
                  key={variant.slug}
                  type="button"
                  onClick={() => onSelectVariant(variant.slug)}
                  aria-pressed={isSelected}
                  className={cn(
                    "inline-flex min-w-20 items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-sm transition-all",
                    isSelected
                      ? "border-storefront-ink bg-storefront-ink font-medium text-storefront-bg shadow-sm"
                      : "border-black/10 bg-white text-storefront-ink hover:border-storefront-ink/50 hover:shadow-sm",
                    soldOut && !isSelected && "text-muted-foreground line-through",
                  )}
                >
                  {isSelected && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
                  {variantLabel(variant)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Availability note ---------------------------------------------- */}
      {isOutOfStock ? (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {hasOtherOptions
            ? "This option is sold out — choose another above."
            : "This item is sold out right now. Check back soon."}
        </p>
      ) : isPreorder ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium">
              {preorderWaitText(selectedVariant.preorder_lead_time_days)}
            </span>
            <br />
            This item is made to order — place it now and it ships when ready.
            {deposit && (
              <>
                <br />
                <span className="font-medium">{deposit}</span> — the rest is due on delivery.
              </>
            )}
          </span>
        </div>
      ) : (
        isLowStock && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Checkout fast! only a few left.
          </p>
        )
      )}

      {/* Quantity + add ------------------------------------------------- */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className={cn(storefrontType.navLabel, "text-muted-foreground")}>Qty</span>
          <QuantityStepper
            size="md"
            value={quantity}
            onChange={setQuantity}
            disabled={isOutOfStock}
          />
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={cn(
            storefrontType.navLabel,
            "h-14 w-full rounded-xl bg-storefront-ink text-storefront-bg shadow-sm transition-all",
            "hover:opacity-90 active:translate-y-px disabled:opacity-40 disabled:hover:opacity-40",
          )}
        >
          {isOutOfStock ? "Sold out" : isPreorder ? "Preorder" : "Add to cart"}
        </button>
      </div>

      {/* Reassurance ---------------------------------------------------- */}
      <p className="flex items-start gap-2 border-t border-black/10 pt-5 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        No payment taken online — {product.shop.name} confirms your order and arranges payment with
        you directly.
      </p>
    </div>
  );
}
