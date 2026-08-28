"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { stockStatusStyles } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { Product, ProductVariant } from "@/lib/types";

const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// variant_name is the preferred label; when it's unset, fall back to
// rendering attributes (e.g. {"size":"M","color":"Red"}) as "Size: M,
// Color: Red" rather than showing nothing.
function variantLabel(variant: ProductVariant): string {
  if (variant.variant_name) return variant.variant_name;
  if (variant.attributes) {
    const entries = Object.entries(variant.attributes);
    if (entries.length > 0) {
      return entries
        .map(([key, value]) => `${key.charAt(0).toUpperCase()}${key.slice(1)}: ${value}`)
        .join(", ");
    }
  }
  return variant.sku;
}

type Status = "in_stock" | "low_stock" | "out_of_stock";

// No precomputed stock_status here, unlike StorefrontProductVariant —
// ProductVariant only carries the raw fields, so this derives it the same
// way the rest of the admin UI treats them: untracked variants have no
// meaningful stock status (see products/page.tsx's stockSummary), and
// low_stock_threshold null means there's no configured low-stock line.
function variantStockStatus(variant: ProductVariant): Status | null {
  if (!variant.track_stock) return null;
  const stock = Number(variant.current_stock);
  if (stock <= 0) return "out_of_stock";
  const threshold = variant.low_stock_threshold !== null ? Number(variant.low_stock_threshold) : null;
  if (threshold !== null && stock <= threshold) return "low_stock";
  return "in_stock";
}

interface VariantPickerDialogProps {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSelectVariant: (product: Product, variant: ProductVariant) => void;
}

export function VariantPickerDialog({
  product,
  onOpenChange,
  onSelectVariant,
}: VariantPickerDialogProps) {
  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product?.name ?? "Select variant"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {product?.variants.map((variant) => {
            const isOutOfStock = variant.track_stock && Number(variant.current_stock) <= 0;
            const status = variantStockStatus(variant);

            return (
              <button
                key={variant.id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => onSelectVariant(product, variant)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                  "hover:border-primary hover:bg-muted/40",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{variantLabel(variant)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {priceFormatter.format(Number(variant.selling_price))}
                  </span>
                </div>
                {status && (
                  <Badge variant="outline" className={cn("shrink-0", stockStatusStyles[status].badgeClassName)}>
                    {stockStatusStyles[status].label}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
