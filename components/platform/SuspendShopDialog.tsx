"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, Undo2 } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useSuspendShop } from "@/lib/hooks/useSuspendShop";
import { useRestoreShop } from "@/lib/hooks/useRestoreShop";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlatformShop } from "@/lib/types";
import { controls, notice, noticeTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// SuspendShopRequest: required, 5–500. Mirrored so staff find out before the
// round trip.
const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;

/**
 * Suspend or restore a shop, behind a confirmation that says what suspension
 * actually does.
 *
 * THE COPY IS THE POINT, and it is the thing most likely to be got wrong here.
 * Suspending locks the OWNER out of their admin. It does NOT take the
 * storefront down: customers keep browsing and can still complete checkout.
 * That asymmetry is the entire reason this exists separately from the
 * `is_active` kill switch — which this app deliberately does not expose,
 * because it strands customers mid-order.
 *
 * So the dialog states both halves in the same breath. Wording that merely
 * implies "this shuts the shop down" would get this used for the wrong thing,
 * by someone who reached for it expecting a kill switch and got a shop that
 * kept taking orders nobody could fulfil.
 *
 * The reason is required and the OWNER READS IT — a suspended shop's owner
 * gets a 403 carrying this text as `detail`. Told only "suspended", they can
 * do nothing but open a support ticket.
 */
export function SuspendShopDialog({ shop }: { shop: PlatformShop }) {
  const isSuspended = shop.is_suspended;

  const [open, setOpen] = useState(false);
  // Pre-filled when re-suspending: the API treats a second suspend as an edit
  // of the reason (keeping the original timestamp), so the existing text is
  // the starting point, not a blank box.
  const [reason, setReason] = useState(shop.suspension_reason ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const suspend = useSuspendShop();
  const restore = useRestoreShop();
  const mutation = isSuspended ? restore : suspend;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setReason(shop.suspension_reason ?? "");
      setValidationError(null);
      mutation.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    mutation.reset();

    try {
      if (isSuspended) {
        await restore.mutateAsync(shop.id);
        toast.success(`${shop.name} restored. The owner can sign in again.`);
      } else {
        const trimmed = reason.trim();
        if (trimmed.length < MIN_REASON_LENGTH) {
          setValidationError(
            "Say why — the owner is shown this text when they're locked out, and \"suspended\" on its own just becomes a support ticket.",
          );
          return;
        }
        setValidationError(null);
        await suspend.mutateAsync({ id: shop.id, reason: trimmed });
        toast.success(`${shop.name} suspended. Their storefront is still serving customers.`);
      }
      setOpen(false);
    } catch {
      // Surfaced inside the dialog below.
    }
  }

  // The API's own field error wins over the local one — it knows the real
  // rules, this only mirrors them.
  const serverFieldError =
    mutation.error instanceof ApiError ? mutation.error.errors?.reason?.[0] : undefined;
  const fieldError = serverFieldError ?? validationError;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={isSuspended ? "default" : "outline"}
            className={controls.button}
          />
        }
      >
        {isSuspended ? <Undo2 className="size-4" /> : <Ban className="size-4" />}
        {isSuspended ? "Restore access" : "Suspend shop"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isSuspended ? `Restore ${shop.name}?` : `Suspend ${shop.name}?`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          {isSuspended ? (
            <p>
              The owner will be able to sign in to their dashboard again, and the reason
              recorded against this suspension is cleared.
            </p>
          ) : (
            <>
              {/* Both halves, together, in the loudest thing on the dialog.
                  Someone reaching for a kill switch has to bounce off this
                  sentence before they can click the button. */}
              <div className={cn(notice, noticeTone.warning)} role="note">
                <p className="text-pretty">
                  <span className="font-semibold">The owner will be locked out of their
                  dashboard.</span>{" "}
                  Their storefront stays online and customers can still order — including
                  orders nobody will be able to fulfil while this is in place.
                </p>
              </div>
              <p>
                Nothing is deleted, and you can restore access from this screen at any time.
              </p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isSuspended && (
            <Label className="flex flex-col items-stretch gap-1 font-normal">
              <span className="text-sm">Reason (the owner will read this)</span>
              <Textarea
                rows={3}
                maxLength={MAX_REASON_LENGTH}
                placeholder="e.g. Three chargebacks in a week — contact billing@ before this can be lifted."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setValidationError(null);
                }}
                aria-invalid={fieldError ? true : undefined}
              />
              {fieldError && <span className="text-sm text-destructive">{fieldError}</span>}
            </Label>
          )}

          <ApiErrorState
            error={fieldError ? null : mutation.error}
            fallback="Could not change this shop's access. Please try again."
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className={controls.button}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant={isSuspended ? "default" : "destructive"}
              disabled={mutation.isPending}
              className={controls.button}
            >
              {mutation.isPending
                ? isSuspended
                  ? "Restoring..."
                  : "Suspending..."
                : isSuspended
                  ? "Restore access"
                  : "Lock the owner out"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
