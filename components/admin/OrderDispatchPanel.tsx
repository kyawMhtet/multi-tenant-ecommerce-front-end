"use client";

import { PackageCheck, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DispatchOrderDialog } from "@/components/admin/DispatchOrderDialog";
import { typography } from "@/lib/design-tokens";
import type { Order } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Who is carrying this order, and whether it has gone yet.
 *
 * Sits directly under the address panel, which is the order staff work in:
 * where it goes, then who took it. Kept as its own panel rather than folded
 * into that one because it can be absent independently — a pickup order has
 * an address block's worth of nothing to say here.
 *
 * Dispatching never changes the order's status, so nothing in this panel
 * contradicts the status badge in the header: a "pending" order can be
 * legitimately marked Sent, and that's exactly the case this exists for.
 */
export function OrderDispatchPanel({ order }: { order: Order }) {
  // The parcel never leaves the shop, so there is no courier question to
  // answer. The backend agrees — dispatching a pickup order is a 422.
  if (order.fulfillment_type === "pickup") return null;

  // Same fallback as CancelOrderDialog: cancelled_at is the fact, the
  // status string covers a response that predates it.
  const isCancelled =
    Boolean(order.cancelled_at) || order.status.toLowerCase().startsWith("cancel");

  // A cancelled order that never shipped has nothing to record and nothing
  // to offer — the backend rejects dispatching it. One that DID ship still
  // shows its dispatch record: the parcel is out there either way, and
  // that's exactly what staff need to know when the customer calls.
  if (isCancelled && !order.is_dispatched) return null;

  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={typography.sectionHeading}>Dispatch</span>
          {!isCancelled && (
            <DispatchOrderDialog
              order={order}
              label={order.is_dispatched ? "Change courier" : "Dispatch"}
              variant={order.is_dispatched ? "outline" : "default"}
            />
          )}
        </div>

        {order.is_dispatched ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
            <p className="flex items-start gap-2 text-sm font-medium">
              <PackageCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {/* The snapshotted name, never a lookup by id: the id goes
                  null once a courier is deleted, and an order that shipped
                  with "Royal Express" has to keep saying so. */}
              <span>
                Sent with {order.delivery_provider_name ?? "a courier"}
                {order.tracking_number && (
                  // Selectable and monospaced-width: this gets read out on
                  // the phone and pasted into a courier's site.
                  <>
                    {" · "}
                    <span className="tabular-nums">{order.tracking_number}</span>
                  </>
                )}
              </span>
            </p>

            {(order.dispatched_at || order.dispatched_by_name) && (
              <p className="pl-6 text-xs text-muted-foreground">
                {order.dispatched_at && dateFormatter.format(new Date(order.dispatched_at))}
                {order.dispatched_at && order.dispatched_by_name && " · "}
                {order.dispatched_by_name && `by ${order.dispatched_by_name}`}
              </p>
            )}
          </div>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Truck className="mt-0.5 size-4 shrink-0" />
            Not sent yet. Marking it sent records the courier and tracking number — it
            doesn&apos;t change the order&apos;s status or its payment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
