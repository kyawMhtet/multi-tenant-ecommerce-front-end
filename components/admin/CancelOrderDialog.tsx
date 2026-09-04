"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useCancelOrder } from "@/lib/hooks/useCancelOrder";
import { useCancellationReasons } from "@/lib/hooks/useCancellationReasons";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/shared/ErrorState";
import { OTHER_CANCELLATION_REASON, type Order } from "@/lib/types";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface CancelErrors {
  reason?: string;
  note?: string;
}

/**
 * Cancelling an order, with the reason the backend now requires. The reason
 * list is fetched, never hardcoded — it has already grown twice, and a
 * client-side copy would quietly stop offering the newest option.
 *
 * Nothing here refunds anything: a paid order that gets cancelled comes back
 * with refund_required, and OrderRefundPanel takes it from there. That
 * separation is the backend's, and it's the honest one — the money moved
 * customer → shop directly, so only the shop can move it back.
 */
export function CancelOrderDialog({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const isPartPaid = order.payment_status === "partial";
  const hasCollectedMoney = order.payment_status === "paid" || isPartPaid;
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<CancelErrors>({});
  const {
    data: reasons,
    isPending: reasonsPending,
    error: reasonsError,
  } = useCancellationReasons({ enabled: open });
  const cancel = useCancelOrder();

  // cancelled_at is the fact; the status string is the fallback for a
  // response that predates it.
  const isCancelled = Boolean(order.cancelled_at) || order.status.toLowerCase().startsWith("cancel");
  if (isCancelled) return null;

  const requiresNote = reason === OTHER_CANCELLATION_REASON;
  // Labels for the trigger: Base UI's <SelectValue> renders the raw value
  // unless the root is given an items map (see OrderFilterBar).
  const reasonItems = Object.fromEntries((reasons ?? []).map((r) => [r.code, r.label]));

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setReason("");
      setNote("");
      setErrors({});
      cancel.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    cancel.reset();

    const validationErrors: CancelErrors = {};
    if (!reason) validationErrors.reason = "Choose why this order is being cancelled.";
    // Mirrors the backend rule rather than leaving the shop to discover it
    // through a 422 — "other" with no explanation isn't a reason.
    if (reason === OTHER_CANCELLATION_REASON && !note.trim()) {
      validationErrors.note = "Say what happened — a note is required for this reason.";
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await cancel.mutateAsync({
        id: order.id,
        data: {
          cancellation_reason: reason,
          ...(note.trim() ? { cancellation_note: note.trim() } : {}),
        },
      });
      setOpen(false);
      toast.success(
        hasCollectedMoney
          ? "Order cancelled. Money was collected on this one — send it back."
          : "Order cancelled.",
      );
    } catch {
      // Surfaced via the field errors and the banner below.
    }
  }

  const serverErrors = cancel.error instanceof ApiError ? (cancel.error.errors ?? {}) : {};
  const fieldErrors: CancelErrors = {
    reason: errors.reason ?? serverErrors.cancellation_reason?.[0],
    note: errors.note ?? serverErrors.cancellation_note?.[0],
  };

  const generalError = (() => {
    if (!cancel.error) return null;
    if (!(cancel.error instanceof ApiError)) return "Something went wrong. Please try again.";
    if (fieldErrors.reason || fieldErrors.note) return null;
    return cancel.error.message;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" variant="outline" className={cn(controls.buttonSm, "w-fit")} />}
      >
        Cancel order
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel {order.order_number}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {order.payment_status === "paid"
            ? "This order has been paid. Cancelling it doesn't move any money — you'll need to send the refund yourself, and this screen will keep reminding you until you record it."
            : isPartPaid
              ? // Deliberately NOT the sentence above. refund_required is derived
                // from payment_status "paid" alone server-side, so a cancelled
                // part-paid order raises no refund reminder anywhere in this app —
                // promising one here would be the more expensive kind of wrong.
                "A deposit has already been collected on this order. Cancelling it doesn't move any money, and the refund reminder only covers fully-paid orders — so send the deposit back and keep your own note of it."
              : "The customer will need to be told separately — cancelling here doesn't notify them."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="cancellation-reason" className="text-sm font-normal">
              Reason
            </Label>
            {reasonsError ? (
              <ErrorState message="Couldn't load the cancellation reasons. Close this and try again." />
            ) : (
              <Select
                items={reasonItems}
                value={reason}
                onValueChange={(value) => {
                  setReason(typeof value === "string" ? value : "");
                  setErrors({});
                  cancel.reset();
                }}
              >
                <SelectTrigger
                  id="cancellation-reason"
                  disabled={reasonsPending}
                  aria-invalid={fieldErrors.reason ? true : undefined}
                  className={cn(controls.select, "w-full")}
                >
                  <SelectValue placeholder={reasonsPending ? "Loading..." : "Choose a reason"} />
                </SelectTrigger>
                <SelectContent>
                  {(reasons ?? []).map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {fieldErrors.reason && (
              <span className="text-sm text-destructive">{fieldErrors.reason}</span>
            )}
          </div>

          <Label className="flex flex-col items-stretch gap-1 font-normal">
            <span className="text-sm">Note {requiresNote ? "" : "(optional)"}</span>
            <Textarea
              rows={2}
              maxLength={1000}
              placeholder={
                requiresNote ? "What happened?" : "Anything staff should know later"
              }
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setErrors((prev) => ({ ...prev, note: undefined }));
              }}
              aria-invalid={fieldErrors.note ? true : undefined}
            />
            {fieldErrors.note && (
              <span className="text-sm text-destructive">{fieldErrors.note}</span>
            )}
          </Label>

          {generalError && <ErrorState message={generalError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className={controls.button}>
              Keep order
            </Button>
            <Button type="submit" variant="destructive" disabled={cancel.isPending} className={controls.button}>
              {cancel.isPending ? "Cancelling..." : "Cancel order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
