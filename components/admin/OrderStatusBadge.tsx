import { Badge } from "@/components/ui/badge";
import { orderStatusClassName, statusPill } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * An order's status, wherever it's shown — the dashboard's recent-orders
 * panel, the orders list, the order detail header.
 *
 * All three used to spell out `<Badge variant="outline" className={cn(...)}>`
 * themselves, which is how the dashboard ended up as the only one of the
 * three missing `capitalize` (its rows read "paid", the others "Paid").
 *
 * variant="secondary" rather than "outline": the tint already carries the
 * meaning, and a grey border drawn around a coloured pill muddies it. An
 * unrecognised status keeps the neutral secondary fill.
 */
export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(statusPill, "capitalize", orderStatusClassName[status], className)}
    >
      {status}
    </Badge>
  );
}
