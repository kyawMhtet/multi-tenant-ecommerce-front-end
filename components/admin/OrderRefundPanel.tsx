"use client";

import { BadgeCheck, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RefundOrderDialog } from "@/components/admin/RefundOrderDialog";
import { formatCurrency } from "@/lib/currency";
import { refundOwedClassName, typography } from "@/lib/design-tokens";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Money the shop owes back, and the only place in the app that says so.
 *
 * Cancelling a paid order doesn't refund it: the customer paid the shop
 * directly — by wallet transfer, at the counter, on delivery — so the
 * platform has nothing to reverse. That makes this an outstanding
 * obligation the shop is carrying, which is why it's a loud panel near the
 * top of the order rather than a status somewhere in the payment section.
 *
 * Renders nothing for the ordinary case: an order that was never paid, or
 * was never cancelled, owes nobody anything.
 */
export function OrderRefundPanel({ order }: { order: Order }) {
  const isRefunded = Boolean(order.refunded_at);

  if (!order.refund_required && !isRefunded) return null;

  if (isRefunded) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              <BadgeCheck className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              Refund sent
            </span>
            <span className={typography.muted}>
              {formatCurrency(order.total, order.currency)}
              {order.refunded_at
                ? ` · ${dateFormatter.format(new Date(order.refunded_at))}`
                : ""}
            </span>
          </div>
          {/* The reference the shop recorded — the whole reason for asking. */}
          {order.refund_note && (
            <span className="text-sm text-muted-foreground">{order.refund_note}</span>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-rose-200 bg-rose-50/60 shadow-sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className={cn("w-fit gap-1.5", refundOwedClassName)}>
              <Undo2 className="size-3.5" />
              Refund owed
            </Badge>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(order.total, order.currency)}
            </span>
          </div>
          <RefundOrderDialog order={order} />
        </div>

        <p className="text-sm text-rose-900/80">
          This order was paid and then cancelled. The money went straight from the customer to
          you, so nothing has been returned automatically — send it back yourself, then record it
          here.
        </p>
      </CardContent>
    </Card>
  );
}
