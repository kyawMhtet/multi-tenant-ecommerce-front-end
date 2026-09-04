"use client";

import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { usePaymentMethods } from "@/lib/hooks/usePaymentMethods";
import { useUpdateOrder } from "@/lib/hooks/useUpdateOrder";
import { ErrorState } from "@/components/shared/ErrorState";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { orderAmountPaid, orderBalanceDue } from "@/lib/order-items";
import { controls, typography } from "@/lib/design-tokens";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

// Last resort when the method isn't in the configured list — an old order
// whose method the shop has since removed still has to render as something.
function humanizeMethod(method: string): string {
  const words = method.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Terminal states where accepting makes no sense. Kept as a small deny-list
// rather than an allow-list of "acceptable" statuses: `status` is a free-form
// string server-side, so a new in-progress status should still be acceptable
// by default instead of silently losing its button.
const UNACCEPTABLE_STATUSES = new Set(["cancelled", "canceled", "refunded"]);

export function OrderPaymentPanel({ order }: { order: Order }) {
  // The labels the shop configured, so this shows "Bank / wallet transfer
  // (QR)" rather than a snake_case key — and stays right when the backend
  // adds a method.
  const { data: methods } = usePaymentMethods();
  const updateOrder = useUpdateOrder();

  const payments = order.payments ?? [];
  const methodLabel = order.payment_method
    ? (methods?.find((m) => m.method === order.payment_method)?.label ??
      humanizeMethod(order.payment_method))
    : null;

  const isPaid = order.payment_status === "paid";
  // A deposit landed and the balance hasn't. Expected on a preorder, not a
  // failure — the shop still has to source the goods and collect the rest.
  const isPartPaid = order.payment_status === "partial";
  const amountPaid = orderAmountPaid(order);
  const balanceDue = orderBalanceDue(order);
  // cancelled_at is checked alongside the status string because it's the
  // fact rather than a rendering of it — accepting an order that's already
  // been cancelled (and may owe the customer a refund) must not be one
  // click away because a status came back worded differently.
  const canAccept =
    !isPaid && !order.cancelled_at && !UNACCEPTABLE_STATUSES.has(order.status.toLowerCase());

  async function handleAccept() {
    updateOrder.reset();
    try {
      // One request, both fields: the backend settles the payment record off
      // payment_status, so accepting the order and marking the money
      // received can't drift apart into two half-applied states.
      await updateOrder.mutateAsync({
        id: order.id,
        data: { status: "paid", payment_status: "paid" },
      });
      toast.success("Order accepted and marked paid.");
    } catch {
      // Surfaced via acceptError below.
    }
  }

  const acceptError = updateOrder.error
    ? updateOrder.error instanceof ApiError
      ? updateOrder.error.message
      : "Something went wrong. Please try again."
    : null;

  // Nothing to show for a POS sale that was paid at the counter and carries
  // no method or payment record.
  if (!methodLabel && payments.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className={typography.sectionHeading}>Payment</span>
            {methodLabel && <span className={typography.muted}>{methodLabel}</span>}
          </div>
          <PaymentStatusBadge status={order.payment_status} />
        </div>

        {/* The split, for an order that has only been part-paid. Nothing else
            in the admin says how much is still to come — payment_status alone
            gives the shop a word where it needs a number to collect. */}
        {isPartPaid && amountPaid !== null && balanceDue !== null && (
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-col gap-0.5">
              <span className={typography.microLabel}>Deposit received</span>
              <span className="text-sm font-medium tabular-nums">
                {formatCurrency(amountPaid, order.currency)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span className={typography.microLabel}>Balance to collect</span>
              <span className="text-base font-semibold tabular-nums">
                {formatCurrency(balanceDue, order.currency)}
              </span>
            </div>
          </div>
        )}

        {payments.map((payment) => (
          <div key={payment.id} className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
              <span className="font-medium tabular-nums">
                {formatCurrency(payment.amount, order.currency)}
              </span>
              <span className="text-muted-foreground capitalize">
                {payment.gateway} · {payment.status}
              </span>
              <span className="text-muted-foreground">
                {payment.paid_at
                  ? `Paid ${dateFormatter.format(new Date(payment.paid_at))}`
                  : dateFormatter.format(new Date(payment.created_at))}
              </span>
            </div>

            {payment.proof_url && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Customer&apos;s screenshot</span>
                {/* Inline at a size you can read an amount off, expanding to
                    an overlay rather than a new tab — the shop is comparing
                    this against the order on this same screen, and a new
                    tab takes the order away from beside it. */}
                <ImageLightbox
                  src={payment.proof_url}
                  alt="Payment screenshot from the customer"
                  title="Customer's screenshot"
                />
              </div>
            )}
          </div>
        ))}

        {acceptError && <ErrorState message={acceptError} />}

        {canAccept && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className={cn(controls.button, "w-fit")}
              disabled={updateOrder.isPending}
              onClick={handleAccept}
            >
              {updateOrder.isPending
                ? "Accepting..."
                : isPartPaid
                  ? "Mark the balance collected"
                  : "Accept order & mark paid"}
            </Button>
            <span className="flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              A screenshot is the customer&apos;s claim, not confirmation. Check the money
              arrived in your account before accepting.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
