"use client";

import { CalendarClock } from "lucide-react";
import { typography } from "@/lib/design-tokens";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

// "12 Sep" — day and month, as specified. The year is added only when the
// date lands outside the current one, which a lead time of up to 365 days
// easily does: "12 Sep" alone would then be a year wrong.
function formatReadyBy(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}

/**
 * When an order with preorder lines is expected to be ready — the longest
 * lead time across those lines, counted from the order date.
 *
 * Renders nothing when `preorder_ready_by` is null. That's a real state
 * (nobody gave an estimate on any of these lines), and the one thing this
 * must never do is show a date the shop didn't promise: it's what staff
 * will repeat to the customer on the phone.
 */
export function OrderPreorderNotice({ order }: { order: Order }) {
  if (!order.has_preorder_items) return null;

  const readyBy = order.preorder_ready_by ? formatReadyBy(order.preorder_ready_by) : null;

  return (
    <p className={cn(typography.muted, "flex items-center gap-2")}>
      <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
      {readyBy ? (
        <span>
          Estimated ready: <span className="font-medium text-foreground">{readyBy}</span>
        </span>
      ) : (
        // Said rather than left blank: "pending for weeks" needs an
        // explanation even when there's no date to give.
        <span>Contains preorder items — no estimated date was given.</span>
      )}
    </p>
  );
}
