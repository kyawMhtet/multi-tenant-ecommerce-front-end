import { Badge } from "@/components/ui/badge";
import { backorderClassName, statusPill } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * "7 on backorder" — units sold that the shop still owes customers.
 *
 * Deliberately not a StockBadge variant. Low stock and a backlog look
 * similar in the data (both "not enough") but call for opposite actions:
 * low stock means reorder soon, a backlog means customers are already
 * waiting and the supplier needs chasing. Same colour would blur that, so
 * they never share one.
 */
export function BackorderBadge({ units, className }: { units: number; className?: string }) {
  if (units <= 0) return null;

  return (
    <Badge
      variant="secondary"
      className={cn(statusPill, "shrink-0 tabular-nums", backorderClassName, className)}
    >
      {units} on backorder
    </Badge>
  );
}
