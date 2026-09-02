import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { stockStatusStyles, statusPill } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { DashboardLowStockVariant } from "@/lib/types";

// px-5 matches the gutter TableCard gives the tables in the panels beside
// this one — a list and a table sitting in the same row of the dashboard
// have to share one left edge or the grid looks misaligned.
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
            className="group flex items-center gap-3 px-5 py-4 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="min-w-0 flex-1 truncate font-medium">
              {variant.product_name}
              {variant.variant_name && (
                <span className="font-normal text-muted-foreground"> — {variant.variant_name}</span>
              )}
            </span>
            <Badge
              variant="secondary"
              className={cn(statusPill, "shrink-0 tabular-nums", badgeClassName)}
            >
              {Number(variant.current_stock)} / {Number(variant.low_stock_threshold)}
            </Badge>
            {/* Only on hover: the row is a link, but a permanent chevron on
                every row turns a quiet list into a column of arrows. */}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  );
}
