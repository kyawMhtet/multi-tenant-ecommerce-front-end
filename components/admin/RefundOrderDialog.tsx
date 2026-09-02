"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useRefundOrder } from "@/lib/hooks/useRefundOrder";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatCurrency } from "@/lib/currency";
import type { Order } from "@/lib/types";

/**
 * Recording a refund the shop has already sent. This moves no money — it
 * can't: the customer paid the shop directly, so the transfer happens in
 * the shop's own banking app and this is where they write down that it
 * happened.
 *
 * The note is optional to the API and prompted for anyway. It's the
 * reference ("KBZPay ref 8891") that answers "did you actually send it?"
 * weeks later, when nobody remembers.
 */
export function RefundOrderDialog({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const refund = useRefundOrder();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setNote("");
      refund.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    refund.reset();

    try {
      await refund.mutateAsync({
        id: order.id,
        data: note.trim() ? { refund_note: note.trim() } : {},
      });
      setOpen(false);
      toast.success("Refund recorded.");
    } catch {
      // Surfaced via submitError below.
    }
  }

  const submitError = (() => {
    if (!refund.error) return null;
    if (!(refund.error instanceof ApiError)) return "Something went wrong. Please try again.";
    // The one documented 422: an order that was never paid has nothing to
    // give back. The API's own message says it better than a guess would.
    return refund.error.errors?.refund_note?.[0] ?? refund.error.message;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" className={cn(controls.buttonSm, "w-fit")} />}>
        Record refund sent
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record refund for {order.order_number}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Only record this once you&apos;ve actually sent{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatCurrency(order.total, order.currency)}
          </span>{" "}
          back to {order.customer_name || "the customer"}. Nothing is transferred from here — this
          marks the order as settled so it stops showing as money you owe.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Label className="flex flex-col items-stretch gap-1 font-normal">
            <span className="text-sm">Reference (optional)</span>
            <Input
              type="text"
              maxLength={255}
              placeholder="KBZPay ref 8891"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={controls.input}
            />
            <span className="text-xs text-muted-foreground">
              However you sent it — a transaction id, the wallet, the date. This is what
              you&apos;ll want if the customer asks later.
            </span>
          </Label>

          {submitError && <ErrorState message={submitError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className={controls.button}>
              Not yet
            </Button>
            <Button type="submit" disabled={refund.isPending} className={controls.button}>
              {refund.isPending ? "Saving..." : "I've sent it"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
