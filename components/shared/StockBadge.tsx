import { Badge } from "@/components/ui/badge";
import { stockStatusStyles } from "@/lib/design-tokens";
import type { StorefrontProductVariant } from "@/lib/types";

interface StockBadgeProps {
  status: StorefrontProductVariant["stock_status"];
  // Override the default admin label — the storefront passes its own
  // vocabulary ("Sold out" rather than "Out of stock"). Colours stay the same.
  label?: string;
}

export function StockBadge({ status, label }: StockBadgeProps) {
  const style = stockStatusStyles[status];
  return (
    <Badge variant="outline" className={style.badgeClassName}>
      {label ?? style.label}
    </Badge>
  );
}
