import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { stockStatusStyles } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { DashboardLowStockVariant } from "@/lib/types";

export function LowStockList({ variants }: { variants: DashboardLowStockVariant[] }) {
  return (
    <div className="flex flex-col divide-y">
      {variants.map((variant) => {
        const status = Number(variant.current_stock) <= 0 ? "out_of_stock" : "low_stock";
        const { badgeClassName } = stockStatusStyles[status];

        return (
          <Link
            key={variant.product_id}
            href={`/products/${variant.product_id}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-muted/60"
          >
            <span className="font-medium">
              {variant.product_name}
              {variant.variant_name && (
                <span className="font-normal text-muted-foreground"> — {variant.variant_name}</span>
              )}
            </span>
            <Badge variant="outline" className={cn("shrink-0 tabular-nums", badgeClassName)}>
              {Number(variant.current_stock)} / {Number(variant.low_stock_threshold)}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
