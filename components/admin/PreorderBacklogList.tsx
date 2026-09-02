import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { backorderClassName, statusPill } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { DashboardPreorderBacklogVariant } from "@/lib/types";

/**
 * Variants sold past zero, and how many units each owes.
 *
 * The sibling of LowStockList, deliberately kept apart from it: the backend
 * now excludes negative-stock variants from the low-stock figures, so
 * nothing appears in both, and the two ask for different things — this list
 * means "customers are waiting, chase the supplier", low stock means
 * "reorder before it runs out".
 */
export function PreorderBacklogList({
  variants,
}: {
  variants: DashboardPreorderBacklogVariant[];
}) {
  return (
    <div className="flex flex-col divide-y">
      {variants.map((variant) => {
        // Number() rather than trusting the JSON type: the low-stock rows
        // alongside these arrive as decimal-cast strings, and this figure
        // comes off the same column.
        const unitsOwed = Number(variant.units_owed);

        return (
          <Link
            key={`${variant.product_id}-${variant.variant_name ?? ""}`}
            href={`/products/${variant.product_id}`}
            className="group flex items-center gap-3 px-5 py-4 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium">
                {variant.product_name}
                {variant.variant_name && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    — {variant.variant_name}
                  </span>
                )}
              </span>
              {/* Only when there is one. No estimate is a real answer here,
                  and a blank line is the honest way to show it. */}
              {variant.preorder_lead_time_days && (
                <span className="text-xs text-muted-foreground">
                  ~{variant.preorder_lead_time_days} day wait
                </span>
              )}
            </span>
            <Badge
              variant="secondary"
              className={cn(statusPill, "shrink-0 tabular-nums", backorderClassName)}
            >
              {unitsOwed} owed
            </Badge>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  );
}
