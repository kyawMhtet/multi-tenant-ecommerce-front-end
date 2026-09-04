import { formatPrice } from "@/lib/currency";
import { isOnSale } from "@/lib/discount";
import { typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/lib/types";

/**
 * What a variant sells for, in a table cell.
 *
 * Two figures whenever a promotion is live: effective_price as THE price, and
 * the list price struck through beside it. Both come off the API — nothing
 * here works out a reduction, because the variant the shop is looking at and
 * the variant the checkout prices are the same row and must not be able to
 * disagree about what it costs.
 *
 * Only for a LIVE promotion. A scheduled one still sells at the list price
 * today, so showing its future figure here would be a lie with a date on it;
 * DiscountBadge is what says one is coming.
 */
export function VariantPrice({
  variant,
  className,
}: {
  variant: ProductVariant;
  className?: string;
}) {
  if (!isOnSale(variant)) {
    return (
      <span className={cn(typography.numeric, className)}>
        {formatPrice(variant.selling_price)}
      </span>
    );
  }

  return (
    <span className={cn("flex flex-wrap items-baseline gap-x-1.5", className)}>
      <span className={cn(typography.numeric, "font-medium")}>
        {formatPrice(variant.effective_price)}
      </span>
      <span className={cn(typography.numeric, "text-xs text-muted-foreground line-through")}>
        {formatPrice(variant.selling_price)}
      </span>
    </span>
  );
}
