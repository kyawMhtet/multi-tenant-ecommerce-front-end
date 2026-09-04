import { Badge } from "@/components/ui/badge";
import { discountStateStyles, statusPill } from "@/lib/design-tokens";
import { discountState } from "@/lib/discount";
import { cn } from "@/lib/utils";
import type { DiscountFields } from "@/lib/discount";

/**
 * Whether a variant's promotion is running, waiting, or over.
 *
 * Driven off discountState(), never off "has a discount_type": a promotion
 * scheduled for next month has a type, a value and both dates, and reads as
 * live to anything that checks for their presence — which is precisely how a
 * shop ends up advertising a sale weeks early to nobody's surprise but its
 * own. Renders nothing when there is no promotion at all.
 */
export function DiscountBadge({
  variant,
  detail,
  className,
}: {
  variant: DiscountFields;
  // What the promotion actually is ("20% off", "until 10 Sep") when there's
  // room for it — the badge alone says the state, not the terms.
  detail?: string | null;
  className?: string;
}) {
  const state = discountState(variant);
  if (state === "none") return null;

  const style = discountStateStyles[state];

  return (
    <Badge
      variant="secondary"
      className={cn(statusPill, style.badgeClassName, className)}
    >
      {detail ? `${style.label} · ${detail}` : style.label}
    </Badge>
  );
}
