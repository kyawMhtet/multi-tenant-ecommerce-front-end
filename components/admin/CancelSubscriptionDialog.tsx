"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCancelSubscription } from "@/lib/hooks/useCancelSubscription";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBillingDate } from "@/lib/billing";
import type { Subscription } from "@/lib/types";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Cancelling takes nothing away today: it stops the next charge and leaves
 * every day already paid for intact. The copy leads with that, because a
 * shop that believes cancelling kills its storefront immediately will keep
 * paying for a service it no longer wants — and then charge back.
 */
export function CancelSubscriptionDialog({ subscription }: { subscription: Subscription }) {
  const [open, setOpen] = useState(false);
  const cancel = useCancelSubscription();

  // Nothing to cancel twice. cancelled_at is the fact; cancel_at_period_end
  // covers a subscription already winding down.
  if (subscription.cancelled_at || subscription.cancel_at_period_end) return null;

  const accessEnds = formatBillingDate(subscription.access_ends_at);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) cancel.reset();
  }

  async function handleCancel() {
    cancel.reset();
    try {
      await cancel.mutateAsync();
      setOpen(false);
      toast.success(
        accessEnds
          ? `Subscription cancelled. You keep full access until ${accessEnds}.`
          : "Subscription cancelled. You keep the access you've already paid for.",
      );
    } catch {
      // Surfaced inside the dialog below.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className={cn(controls.buttonSm, "w-fit")} />
        }
      >
        Cancel subscription
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel your subscription?</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            {accessEnds
              ? `You'll keep everything on ${subscription.plan_label} until ${accessEnds}. Nothing changes before then — we just won't charge you again.`
              : `You'll keep the access you've already paid for. Nothing changes today — we just won't charge you again.`}
          </p>
          <p>
            After that your shop becomes read-only: your storefront, POS and orders keep working,
            but you won&apos;t be able to add products or change your settings. You can start a
            plan again at any time.
          </p>
        </div>

        <ApiErrorState
          error={cancel.error}
          fallback="Could not cancel your subscription. Please try again."
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className={controls.button}
          >
            Keep subscription
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={cancel.isPending}
            onClick={handleCancel}
            className={controls.button}
          >
            {cancel.isPending ? "Cancelling..." : "Cancel subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
