import { Badge } from "@/components/ui/badge";
import { invoiceStatusLabel, invoiceStatusStyle } from "@/lib/billing";
import type { PlatformInvoice, SubscriptionInvoice } from "@/lib/types";
import { statusPill } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * The one pill allowed to say where an invoice stands.
 *
 * In shared/ because both apps render it over the same rows from opposite
 * sides — the shop's own payment history and the platform's ledger and review
 * queue — and the whole point of invoiceStatusLabel() is that those three can
 * never disagree. A pending invoice with a screenshot reads "Awaiting review"
 * to everyone; only `status: "paid"` produces the word "Paid".
 *
 * "void" arrives as "Superseded" in the app's one uncoloured pill: the shop
 * asked for a different plan (or staff changed its billing currency) before
 * paying, so it is history to find rather than a state to act on. Giving it a
 * wash would put it in the same visual league as a rejected transfer.
 */
export function InvoiceStatusBadge({
  invoice,
  className,
}: {
  invoice: SubscriptionInvoice | PlatformInvoice;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(statusPill, invoiceStatusStyle(invoice.status), className)}
    >
      {invoiceStatusLabel(invoice)}
    </Badge>
  );
}
