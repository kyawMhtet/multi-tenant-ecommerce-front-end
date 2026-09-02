import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { backorderClassName, statusPill } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * "Preorder" on an order row or an order line.
 *
 * Load-bearing on the orders list: a preorder order sits at status
 * "pending" for weeks while the stock is on its way, so without this it's
 * indistinguishable from an order nobody has got round to.
 *
 * Shares the backorder colour on purpose — a preorder order and a
 * backordered variant are the same fact seen from two ends (stock owed to a
 * customer), so they read as one thing across the app.
 */
export function PreorderBadge({
  leadTimeDays,
  className,
}: {
  // The line's own estimate, when there is one. Null is common and means
  // "no estimate given" — the badge just says Preorder rather than
  // inventing a number.
  leadTimeDays?: number | null;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(statusPill, "gap-1.5", backorderClassName, className)}>
      <CalendarClock className="size-3.5" />
      {leadTimeDays ? `Preorder · ~${leadTimeDays} days` : "Preorder"}
    </Badge>
  );
}
