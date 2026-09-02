"use client";

import { Ban, Bot, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { typography } from "@/lib/design-tokens";
import type { Order } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Why this order was cancelled, who did it, and when.
 *
 * The label comes from the API (`cancellation_reason_label`) rather than a
 * code→text map here: the reason list is backend-owned and has already
 * grown twice, so a local map would render new codes as raw snake_case.
 *
 * A null `cancelled_by_name` means the system cancelled it — an expired
 * payment window, or a gateway it couldn't reach — not an anonymous member
 * of staff. Staff will act very differently on "the clock ran out" than on
 * "someone here cancelled this", so the two never look the same.
 */
export function OrderCancellationPanel({ order }: { order: Order }) {
  if (!order.cancelled_at && !order.cancellation_reason_label) return null;

  const byStaff = Boolean(order.cancelled_by_name);
  const ActorIcon = byStaff ? User : Bot;

  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Ban className="size-4 shrink-0 text-destructive" aria-hidden="true" />
            Cancelled
          </span>
          {order.cancelled_at && (
            <span className={typography.muted}>
              {dateFormatter.format(new Date(order.cancelled_at))}
            </span>
          )}
        </div>

        {/* The label, never the code — see the note above. */}
        {order.cancellation_reason_label && (
          <span className="text-sm">{order.cancellation_reason_label}</span>
        )}

        {order.cancellation_note && (
          <p className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-line">
            {order.cancellation_note}
          </p>
        )}

        <span className={`flex items-center gap-1.5 ${typography.muted}`}>
          <ActorIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {byStaff
            ? `Cancelled by ${order.cancelled_by_name}`
            : "Cancelled automatically — the payment window expired, or the payment gateway couldn't be reached."}
        </span>
      </CardContent>
    </Card>
  );
}
