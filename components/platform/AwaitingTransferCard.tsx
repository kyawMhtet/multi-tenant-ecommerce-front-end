"use client";

import { differenceInCalendarDays, formatDistanceToNowStrict, parseISO } from "date-fns";
import { Clock, Copy, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { InvoiceStatusBadge } from "@/components/shared/InvoiceStatusBadge";
import { ReviewInvoiceDialog } from "@/components/platform/ReviewInvoiceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBillingDate } from "@/lib/billing";
import { formatMoney } from "@/lib/currency";
import type { PlatformInvoice } from "@/lib/types";
import { statusPill, surface, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const EXPIRY_DAYS = 30;
const CHASE_AFTER_DAYS = 14;

function ageOf(createdAt: string) {
  const raised = parseISO(createdAt);
  const days = differenceInCalendarDays(new Date(), raised);

  return {
    days,
    label: formatDistanceToNowStrict(raised),
    raised: formatBillingDate(createdAt),
  };
}

function ageClassName(days: number): string {
  if (days >= EXPIRY_DAYS) return "text-red-700";
  if (days >= CHASE_AFTER_DAYS) return "text-amber-700";
  return "text-muted-foreground";
}

function ContactRow({
  icon: Icon,
  value,
  href,
  label,
}: {
  icon: typeof Mail;
  value: string;
  href: string;
  label: string;
}) {
  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  }

  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <a href={href} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
        {value}
      </a>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={typography.microLabel}>{label}</span>
      <span className="text-sm font-medium break-words">{value}</span>
    </div>
  );
}

export function AwaitingTransferCard({ invoice }: { invoice: PlatformInvoice }) {
  const age = ageOf(invoice.created_at);
  const shopName = invoice.shop.name ?? "Unknown shop";
  const hasContact = Boolean(invoice.shop.owner_email || invoice.shop.owner_phone);

  const periodStart = formatBillingDate(invoice.period_start);
  const periodEnd = formatBillingDate(invoice.period_end);
  const period =
    periodStart && periodEnd ? `${periodStart} – ${periodEnd}` : (periodStart ?? periodEnd ?? "—");

  return (
    <div className={cn(surface.panel, "flex flex-col gap-5 p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={typography.sectionHeading}>{shopName}</h3>
            {invoice.shop.slug && (
              <Badge variant="outline" className={cn(statusPill, "text-muted-foreground")}>
                {invoice.shop.slug}
              </Badge>
            )}
            <InvoiceStatusBadge invoice={invoice} />
          </div>
          <span className={typography.muted}>
            {formatMoney(invoice.amount, invoice.currency)} · {invoice.reference} ·{" "}
            {invoice.plan_label}
          </span>
        </div>

        <div className="flex flex-col items-end gap-0.5 text-right">
          <span
            className={cn(
              "flex items-center gap-1.5 text-lg font-semibold tracking-tight",
              ageClassName(age.days),
            )}
          >
            <Clock className="size-4" aria-hidden="true" />
            {age.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {age.raised ? `Asked ${age.raised}` : "Date unknown"}
          </span>
        </div>
      </div>

      {hasContact ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
          <span className={typography.microLabel}>Who to chase</span>
          {invoice.shop.owner_email && (
            <ContactRow
              icon={Mail}
              label="Email"
              value={invoice.shop.owner_email}
              href={`mailto:${invoice.shop.owner_email}`}
            />
          )}
          {invoice.shop.owner_phone && (
            <ContactRow
              icon={Phone}
              label="Phone"
              value={invoice.shop.owner_phone}
              href={`tel:${invoice.shop.owner_phone}`}
            />
          )}
        </div>
      ) : (
        <p className={cn(typography.muted, "rounded-xl border border-dashed p-3")}>
          No owner email or phone on this shop, so there is nobody to chase from here.
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        <Fact label="Period" value={period} />
        <Fact label="Shop ID" value={invoice.shop.id != null ? String(invoice.shop.id) : "—"} />
        <Fact
          label="Expires"
          value={
            age.days >= EXPIRY_DAYS
              ? "Past 30 days — voided on their next attempt"
              : `In ${EXPIRY_DAYS - age.days} days`
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <p className={cn(typography.muted, "mr-auto")}>
          Nothing to review. If {invoice.reference} is on the bank statement, settle it here.
        </p>
        <ReviewInvoiceDialog invoice={invoice} action="approve" quiet />
        <ReviewInvoiceDialog invoice={invoice} action="reject" quiet />
      </div>
    </div>
  );
}
