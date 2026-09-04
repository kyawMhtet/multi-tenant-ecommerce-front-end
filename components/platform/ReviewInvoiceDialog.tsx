"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useApproveInvoice } from "@/lib/hooks/useApproveInvoice";
import { useRejectInvoice } from "@/lib/hooks/useRejectInvoice";
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
import { formatBillingDate } from "@/lib/billing";
import { formatMoney } from "@/lib/currency";
import type { PlatformInvoice } from "@/lib/types";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// RejectInvoiceRequest: required, 5–500. ApproveInvoiceRequest: optional, max
// 500. Mirrored here so the reviewer finds out before the round trip.
const MIN_REASON_LENGTH = 5;
const MAX_NOTE_LENGTH = 500;

type ReviewAction = "approve" | "reject";

/**
 * The confirmation step in front of both rulings.
 *
 * One dialog for both because the SHELL is the point — a second click, a
 * restatement of which shop and how much, and no way to fire either ruling
 * from a single mis-click on a list. Two near-identical dialogs is exactly how
 * the reject one ends up missing the amount six months from now.
 *
 * Approving is idempotent server-side but not reversible in this UI: it moves
 * money's worth of entitlement onto a real shop. Rejecting is recoverable (the
 * invoice stays unpaid so the shop can transfer again and re-upload), but the
 * shop READS the reason, so it isn't a throwaway field.
 */
export function ReviewInvoiceDialog({
  invoice,
  action,
  // The chase list keeps both rulings reachable — a transfer spotted on the
  // statement still has to be settleable — but nothing there is waiting on a
  // decision, so neither button may look like the thing to do next.
  quiet = false,
}: {
  invoice: PlatformInvoice;
  action: ReviewAction;
  quiet?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const approve = useApproveInvoice();
  const reject = useRejectInvoice();
  const mutation = action === "approve" ? approve : reject;

  const isReject = action === "reject";
  const amount = formatMoney(invoice.amount, invoice.currency);
  const periodEnd = formatBillingDate(invoice.period_end);
  const shopName = invoice.shop.name ?? "this shop";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setText("");
      setValidationError(null);
      mutation.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    mutation.reset();

    const trimmed = text.trim();

    if (isReject && trimmed.length < MIN_REASON_LENGTH) {
      setValidationError(
        "Say what was wrong with it — the shop reads this, and \"rejected\" on its own just becomes a support ticket.",
      );
      return;
    }
    setValidationError(null);

    try {
      if (isReject) {
        await reject.mutateAsync({ id: invoice.id, reason: trimmed });
        toast.success(`${invoice.reference} rejected. ${shopName} can transfer again and re-upload.`);
      } else {
        await approve.mutateAsync({ id: invoice.id, note: trimmed || undefined });
        toast.success(`${invoice.reference} approved. ${shopName} is now on ${invoice.plan_label}.`);
      }
      setOpen(false);
    } catch {
      // Surfaced inside the dialog below.
    }
  }

  // The API's own field error wins over the local one — it knows the real
  // rules, this only mirrors them.
  const serverFieldError =
    mutation.error instanceof ApiError
      ? (mutation.error.errors?.reason?.[0] ?? mutation.error.errors?.note?.[0])
      : undefined;
  const fieldError = serverFieldError ?? validationError;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={quiet ? (isReject ? "ghost" : "outline") : isReject ? "outline" : "default"}
            className={controls.buttonSm}
          />
        }
      >
        {isReject ? "Reject" : "Approve"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isReject ? "Reject this transfer?" : "Confirm this payment arrived?"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          {/* Restates the three things being ruled on, so the confirmation
              isn't just an "are you sure" over a row you may have scrolled
              past. */}
          <p>
            <span className="font-medium text-foreground">{amount}</span> from{" "}
            <span className="font-medium text-foreground">{shopName}</span>, reference{" "}
            <span className="font-medium text-foreground">{invoice.reference}</span>.
          </p>

          {isReject ? (
            <p>
              The invoice stays unpaid, so {shopName} can transfer again and upload a new
              screenshot against it. Their plan doesn&apos;t change.
            </p>
          ) : (
            <p>
              This puts {shopName} on {invoice.plan_label}
              {periodEnd ? ` until ${periodEnd}` : ""}. Only do this once you&apos;ve found the
              payment on the bank statement — a screenshot on its own isn&apos;t evidence it
              arrived.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Label className="flex flex-col items-stretch gap-1 font-normal">
            <span className="text-sm">
              {isReject ? "Reason (the shop will read this)" : "Note (optional)"}
            </span>
            <Textarea
              rows={3}
              maxLength={MAX_NOTE_LENGTH}
              placeholder={
                isReject
                  ? "e.g. The amount transferred was 500 THB, but this invoice is for 750 THB."
                  : "Anything worth recording against this payment"
              }
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setValidationError(null);
              }}
              aria-invalid={fieldError ? true : undefined}
            />
            {fieldError && <span className="text-sm text-destructive">{fieldError}</span>}
          </Label>

          <ApiErrorState
            error={fieldError ? null : mutation.error}
            fallback="Could not record that. Please try again."
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
              variant={isReject ? "destructive" : "default"}
              disabled={mutation.isPending}
              className={cn(controls.button)}
            >
              {mutation.isPending
                ? isReject
                  ? "Rejecting..."
                  : "Approving..."
                : isReject
                  ? "Reject transfer"
                  : "Approve payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
