"use client";

import { toast } from "sonner";
import { Clock, Copy } from "lucide-react";
import { InvoiceProofField } from "@/components/admin/InvoiceProofField";
import { Button } from "@/components/ui/button";
import { formatBillingDate } from "@/lib/billing";
import { formatMoney } from "@/lib/currency";
import type { SubscriptionInvoice, TransferInstructions } from "@/lib/types";
import { notice, noticeTone, surface, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  } catch {
    // Clipboard access can be refused (insecure origin, denied permission) —
    // the value is on screen either way, so this is a nudge, not an error.
    toast.error(`Couldn't copy — select the ${label.toLowerCase()} and copy it manually.`);
  }
}

function DetailRow({
  label,
  value,
  copyable = false,
  emphasis = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className={typography.microLabel}>{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "truncate text-sm",
            emphasis ? "font-semibold tabular-nums" : "font-medium",
          )}
        >
          {value}
        </span>
        {copyable && (
          <Button
            type="button"
            variant="ghost"
            aria-label={`Copy ${label.toLowerCase()}`}
            onClick={() => copy(value, label)}
            className="size-8 shrink-0 rounded-lg"
          >
            <Copy className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Bank details for a shop that chose to pay by transfer, plus the invoice to
 * quote and somewhere to upload the screenshot.
 *
 * Nothing here says the plan changed, because it hasn't: subscribe() returns
 * what to do next, not a confirmation. The shop has been shown an account
 * number — that's all that has happened — so the panel is framed as "we're
 * waiting for your payment" throughout, and stays that way after a screenshot
 * is uploaded (see InvoiceProofField).
 *
 * The reference is the load-bearing field. Without it in the transfer note,
 * matching an incoming payment to a shop is guesswork for whoever reviews the
 * bank statement, which is why it gets its own emphasis and a copy button.
 */
export function TransferInstructionsPanel({
  instructions,
  invoice,
  // Lets a caller drop the panel chrome — the dialog that shows this already
  // draws a surface, and a bordered card inside it would be a box in a box.
  className,
}: {
  instructions: TransferInstructions | null;
  invoice: SubscriptionInvoice | null;
  className?: string;
}) {
  // Every field is env-held deployment config server-side, so any of them can
  // be null — render what's actually there rather than a column of dashes.
  const rows = [
    instructions?.bank_name && { label: "Bank", value: instructions.bank_name },
    instructions?.account_name && { label: "Account name", value: instructions.account_name },
    instructions?.account_number && {
      label: "Account number",
      value: instructions.account_number,
      copyable: true,
    },
  ].filter((row): row is { label: string; value: string; copyable?: boolean } => Boolean(row));

  const amount =
    instructions?.amount != null
      ? formatMoney(instructions.amount, instructions.currency)
      : invoice
        ? formatMoney(invoice.amount, invoice.currency)
        : null;
  const reference = instructions?.reference ?? invoice?.reference ?? null;
  const periodEnd = formatBillingDate(invoice?.period_end ?? null);

  return (
    <div className={cn(surface.panel, "flex flex-col gap-5 p-5", className)}>
      <div className="flex flex-col gap-1">
        <h3 className={typography.sectionHeading}>Pay by bank transfer</h3>
        <p className={typography.muted}>
          Transfer the amount below, then send us a screenshot so we can match it up.
        </p>
      </div>

      <div className={cn(notice, noticeTone.warning)} role="status">
        <Clock className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <p className="text-pretty">
          {/* The honest state, stated first and without hedging. */}
          <span className="font-semibold">We&apos;re waiting for your payment.</span> Your plan
          stays as it is until someone here confirms the transfer arrived — usually within a
          working day.
        </p>
      </div>

      <div className="flex flex-col">
        {amount && <DetailRow label="Amount" value={amount} emphasis />}
        {rows.map((row) => (
          <DetailRow key={row.label} {...row} />
        ))}
        {reference && <DetailRow label="Reference" value={reference} copyable emphasis />}
        {periodEnd && <DetailRow label="Covers you until" value={periodEnd} />}
      </div>

      {reference && (
        <p className={typography.muted}>
          Put <span className="font-medium text-foreground">{reference}</span> in the transfer
          note. Without it we can&apos;t tell which shop the payment came from.
        </p>
      )}

      {instructions?.notes && (
        <p className={cn(typography.muted, "whitespace-pre-line")}>{instructions.notes}</p>
      )}

      {invoice && <InvoiceProofField invoice={invoice} />}
    </div>
  );
}
