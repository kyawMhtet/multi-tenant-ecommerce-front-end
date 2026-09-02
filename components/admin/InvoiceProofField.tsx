"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ImageUp } from "lucide-react";
import { useUploadInvoiceProof } from "@/lib/hooks/useUploadInvoiceProof";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { isInvoicePayable } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import type { SubscriptionInvoice } from "@/lib/types";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// UploadPaymentProofRequest rules it 'image', 'max:2048' — kilobytes, so 2MB.
// Same non-blocking treatment as ShopImageField: the server is the real
// enforcement, this is an early heads-up.
const MAX_FILE_SIZE_BYTES = 2048 * 1024;

/**
 * Attaching a bank-transfer screenshot to an invoice.
 *
 * The entire copy here exists to prevent one misunderstanding: uploading this
 * settles NOTHING. The invoice stays `pending`, the plan does not move, and a
 * human on the platform side decides. Getting that wrong would be worse than a
 * bug — a shop that believes it has paid stops chasing a transfer that never
 * arrived, and then finds itself read-only with no idea why.
 *
 * So: no success state anywhere says "paid", and the confirmation after a
 * successful upload says explicitly that we're now checking.
 */
export function InvoiceProofField({
  invoice,
  // The paragraph explaining that a screenshot settles nothing. On by default
  // and switched off only where the surrounding UI already carries that
  // meaning — the history table's status column reads "Awaiting review" on the
  // same row, so repeating the paragraph in every cell would be noise rather
  // than clarity. The meaning must never be dropped from BOTH places.
  showNote = true,
}: {
  invoice: SubscriptionInvoice;
  showNote?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const upload = useUploadInvoiceProof();

  // The mutation's own result wins over the prop. The upload invalidates
  // ["billing"], which refreshes the lists this sits inside — but not a
  // detached invoice object handed over by the subscribe response, which the
  // transfer dialog is still holding. Reading the returned row keeps both call
  // sites showing what was actually stored (proof_url is the server's path,
  // not the file we sent) without a second request.
  const current = upload.data ?? invoice;

  // Only an invoice that can still be paid takes a screenshot, and only on the
  // transfer rail — a card invoice is settled by its gateway webhook.
  //
  // isInvoicePayable is an allow-list ("pending" or "failed") rather than a
  // "not paid" check, which is what makes a VOID invoice safe here: it was
  // superseded when the shop asked for a different plan, can never be approved
  // — scopeUnpaid() excludes it — and submitProof() would nonetheless accept
  // an upload against it, since that method only refuses non-manual and
  // already-paid ones. Offering the button would take a screenshot the shop
  // believes settles something that nothing will ever look at.
  if (!isInvoicePayable(current) || current.rail !== "manual") return null;

  async function handleFileSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setWarning(
      file.size > MAX_FILE_SIZE_BYTES
        ? "That image is over 2MB and will likely be rejected. Try a smaller screenshot."
        : null,
    );
    upload.reset();

    try {
      await upload.mutateAsync({ invoiceId: current.id, proof: file });
      toast.success("Screenshot received — we'll check it against the payment and confirm.");
    } catch {
      // Surfaced by ApiErrorState below.
    } finally {
      // Let the same file be picked again after a failure; without this the
      // input's value is unchanged and onChange never fires a second time.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
          className={controls.buttonSm}
        >
          <ImageUp className="size-4" />
          {upload.isPending
            ? "Uploading..."
            : current.proof_url
              ? "Replace screenshot"
              : "Upload screenshot"}
        </Button>

        {current.proof_url && (
          <a
            href={current.proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            View what you sent
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {current.proof_url && showNote && (
        // Said next to the uploaded file. The screenshot being here is a
        // claim; only status: "paid" is payment.
        <p className="text-sm text-muted-foreground">
          We&apos;ve got your screenshot and someone is checking it against the payment. Your plan
          updates once that&apos;s confirmed — nothing has changed yet.
        </p>
      )}

      {warning && <p className={cn("text-sm text-amber-700")}>{warning}</p>}

      <ApiErrorState
        error={upload.error}
        fallback="Could not upload that screenshot. Please try again."
      />
    </div>
  );
}
