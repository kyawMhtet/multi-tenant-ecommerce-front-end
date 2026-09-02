import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusPill } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * "Sent" — this order has been handed to a courier.
 *
 * Load-bearing on the orders list for the same reason PreorderBadge is:
 * dispatch is NOT derivable from status. A cash-on-delivery order is sent
 * while still "pending", so without this the shop cannot tell an order
 * that's already on a bike from one still sitting on the counter.
 *
 * Deliberately neutral rather than given a colour of its own. The coloured
 * pills in this app all mean "act on this" — low stock, refund owed, a
 * backlog. Dispatch is a fact being logged, not a task, and giving it a
 * fifth hue would dilute the ones that do need chasing.
 */
export function DispatchBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={cn(statusPill, "gap-1.5", className)}>
      <Truck className="size-3.5" />
      Sent
    </Badge>
  );
}
