import { ImageOff, Mail, Phone } from "lucide-react";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { InvoiceStatusBadge } from "@/components/shared/InvoiceStatusBadge";
import { ReviewInvoiceDialog } from "@/components/platform/ReviewInvoiceDialog";
import { Badge } from "@/components/ui/badge";
import { formatBillingDate } from "@/lib/billing";
import { formatMoney } from "@/lib/currency";
import type { PlatformInvoice } from "@/lib/types";
import { notice, noticeTone, statusPill, surface, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={typography.microLabel}>{label}</span>
      <span className="text-sm font-medium break-words">{value}</span>
    </div>
  );
}

/**
 * One claimed bank transfer, laid out for the job the reviewer is actually
 * doing: holding a bank statement in one hand and deciding whether this is the
 * same payment.
 *
 * So amount, currency and reference sit together and large — the reference is
 * the string that appears in the transfer note and is the only reliable link
 * between a line on a statement and a shop — with the screenshot beside them
 * rather than a click away.
 *
 * Every row in this queue has a screenshot — proofless intents are their own
 * list now (AwaitingTransferCard), because mixing them in meant the queue had
 * to be visually filtered before it could be worked. The owner's contact
 * details stay here anyway: a screenshot that doesn't match is a phone call.
 */
export function PendingInvoiceCard({ invoice }: { invoice: PlatformInvoice }) {
  const raised = formatBillingDate(invoice.created_at);
  const periodStart = formatBillingDate(invoice.period_start);
  const periodEnd = formatBillingDate(invoice.period_end);
  const period =
    periodStart && periodEnd ? `${periodStart} – ${periodEnd}` : (periodStart ?? periodEnd ?? "—");

  // Defensive: scopeAwaitingApproval() is `status = pending`, so a rejected
  // invoice no longer reaches this queue. Kept so that if it ever does, the
  // reviewer sees what was said last time before ruling again.
  const wasRejected = invoice.status === "failed";

  return (
    <div className={cn(surface.panel, "flex flex-col gap-5 p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={typography.sectionHeading}>{invoice.shop.name ?? "Unknown shop"}</h3>
            {invoice.shop.slug && (
              <Badge variant="outline" className={cn(statusPill, "text-muted-foreground")}>
                {invoice.shop.slug}
              </Badge>
            )}
            <InvoiceStatusBadge invoice={invoice} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {invoice.shop.owner_email && (
              <a
                href={`mailto:${invoice.shop.owner_email}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <Mail className="size-3.5" />
                {invoice.shop.owner_email}
              </a>
            )}
            {invoice.shop.owner_phone && (
              <a
                href={`tel:${invoice.shop.owner_phone}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <Phone className="size-3.5" />
                {invoice.shop.owner_phone}
              </a>
            )}
          </div>
        </div>

        {/* The two things being matched against the statement, together and
            loud. */}
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className={typography.metric}>{formatMoney(invoice.amount, invoice.currency)}</span>
          <span className="text-sm font-medium tabular-nums">{invoice.reference}</span>
          <span className="text-xs text-muted-foreground">{invoice.currency}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        <Fact label="Plan" value={invoice.plan_label} />
        <Fact label="Period" value={period} />
        <Fact label="Raised" value={raised ?? "—"} />
        <Fact label="Shop ID" value={invoice.shop.id != null ? String(invoice.shop.id) : "—"} />
      </div>

      {wasRejected && invoice.note && (
        <div className={cn(notice, noticeTone.danger)} role="status">
          <p className="text-pretty">
            <span className="font-semibold">Previously rejected:</span> {invoice.note}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className={typography.microLabel}>Payment screenshot</span>
        {invoice.proof_url ? (
          <ImageLightbox
            src={invoice.proof_url}
            alt={`Transfer screenshot for ${invoice.reference}`}
            title={`${invoice.reference} — ${invoice.shop.name ?? "Unknown shop"}`}
            thumbnailClassName="max-h-56"
          />
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageOff className="size-4 shrink-0" aria-hidden="true" />
            No screenshot on this row. It belongs on the Awaiting transfer list — check the
            statement for {invoice.reference} before ruling either way.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <ReviewInvoiceDialog invoice={invoice} action="approve" />
        <ReviewInvoiceDialog invoice={invoice} action="reject" />
        <p className={cn(typography.muted, "ml-auto text-right")}>
          A screenshot is a claim. Approve only against the bank statement.
        </p>
      </div>
    </div>
  );
}
