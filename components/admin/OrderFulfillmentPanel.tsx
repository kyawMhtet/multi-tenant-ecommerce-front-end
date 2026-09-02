"use client";

import { toast } from "sonner";
import { Bike, Copy, MapPin, StickyNote, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { controls, typography } from "@/lib/design-tokens";
import type { DeliveryAddress, Order } from "@/lib/types";
import { cn } from "@/lib/utils";

// The structured fields, in the order they'd be read aloud. Each is omitted
// from the API response unless the customer actually filled it, so every one
// is presence-checked before it renders.
const DETAIL_FIELDS: Array<{ key: keyof DeliveryAddress; label: string }> = [
  { key: "house_number", label: "House no." },
  { key: "street", label: "Street" },
  { key: "township", label: "Township" },
  { key: "city", label: "City" },
];

/**
 * Where this order goes — the block that gets read out to a driver, so the
 * address is the loudest thing in it and sits above the order lines.
 *
 * The address shown is the snapshot stored on the order, never the
 * customer's current address: an order delivered somewhere last month has to
 * keep saying so even after they move.
 */
export function OrderFulfillmentPanel({ order }: { order: Order }) {
  const isPickup = order.fulfillment_type === "pickup";
  const address = order.delivery_address;

  // Nothing to say for a POS sale, or an order predating this field.
  if (!order.fulfillment_type && !address) return null;

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Address copied.");
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission)
      // — the address is on screen either way, so this is not worth an
      // error state, just an honest nudge.
      toast.error("Couldn't copy — select the address and copy it manually.");
    }
  }

  const details = address
    ? DETAIL_FIELDS.map(({ key, label }) => ({ label, value: address[key] })).filter(
        (detail): detail is { label: string; value: string } => Boolean(detail.value),
      )
    : [];

  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={typography.sectionHeading}>Fulfillment</span>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5",
              isPickup ? "bg-sky-100 text-sky-900" : "bg-emerald-100 text-emerald-800",
            )}
          >
            {isPickup ? <Store className="size-3.5" /> : <Bike className="size-3.5" />}
            {isPickup ? "Pickup" : "Delivery"}
          </Badge>
        </div>

        {isPickup ? (
          // Said explicitly rather than just omitting the address, so staff
          // don't go hunting for one that was never collected.
          <p className={typography.muted}>
            The customer is collecting this order from the shop. No delivery address.
          </p>
        ) : address ? (
          <>
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="flex min-w-0 items-start gap-2 text-sm leading-relaxed font-medium whitespace-pre-line">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {address.full_address}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(controls.buttonSm, "shrink-0")}
                  onClick={() => handleCopy(address.full_address)}
                >
                  <Copy data-icon="inline-start" className="size-4" />
                  Copy
                </Button>
              </div>

              {details.length > 0 && (
                <dl className="flex flex-wrap gap-x-6 gap-y-1 pl-6 text-sm">
                  {details.map((detail) => (
                    <div key={detail.label} className="flex gap-1.5">
                      <dt className="text-muted-foreground">{detail.label}</dt>
                      <dd>{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {address.note && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <StickyNote className="mt-0.5 size-4 shrink-0" />
                <span className="whitespace-pre-line">{address.note}</span>
              </p>
            )}
          </>
        ) : (
          // A delivery order with no address is a data problem worth naming,
          // not a blank space to be puzzled over.
          <p className="text-sm text-destructive">
            This delivery order has no address recorded. Contact the customer before dispatching.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
