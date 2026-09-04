import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { InvoiceStatusBadge } from "@/components/shared/InvoiceStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { formatBillingDate } from "@/lib/billing";
import { formatMoney } from "@/lib/currency";
import type { PlatformInvoice } from "@/lib/types";
import { typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// NOTE: there is no rail column, and its absence is not an oversight.
// IndexPlatformInvoiceRequest accepts `rail` as a FILTER, but
// PlatformInvoiceResource doesn't publish the invoice's gateway, so this app
// has nothing to render. Filtering by rail therefore narrows the rows without
// labelling them — worth knowing before someone adds a column from a field
// that isn't there.

// Column sets differ by where this is used, and the header and the skeleton
// have to agree on the count or the table visibly reshuffles when data lands.
const LEDGER_COLUMNS = [
  "Reference",
  "Shop",
  "Plan",
  "Period",
  "Raised",
  "Amount",
  "Status",
  "",
] as const;

// On a shop's own detail screen the shop column would repeat the page title on
// every row.
const SHOP_COLUMNS = ["Reference", "Plan", "Period", "Raised", "Amount", "Status", ""] as const;

function columnsFor(showShop: boolean) {
  return showShop ? LEDGER_COLUMNS : SHOP_COLUMNS;
}

function InvoiceTableHead({ showShop }: { showShop: boolean }) {
  const columns = columnsFor(showShop);
  return (
    <TableHeader>
      <TableRow>
        {columns.map((column, i) => (
          <TableHead
            key={column || i}
            className={i === columns.length - 1 ? "text-right" : undefined}
          >
            {column}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function period(invoice: PlatformInvoice): string {
  const from = formatBillingDate(invoice.period_start);
  const to = formatBillingDate(invoice.period_end);
  if (from && to) return `${from} – ${to}`;
  return from ?? to ?? "—";
}

/**
 * The invoice ledger's rows — history, laid out for reconciliation.
 *
 * A table rather than PendingInvoiceCard's card, because the job is different:
 * the queue is one claim at a time held against a bank statement, this is a
 * column of references and amounts you scan down. What the two share is the
 * vocabulary — InvoiceStatusBadge — so neither screen can invent a word for a
 * status the other doesn't use.
 *
 * Both dates are here on purpose. "Raised" is created_at, which is what the
 * `from`/`to` filters match on server-side, so a filtered range has to be
 * legible against a column the reader can see; "Period" is what the money
 * actually bought.
 */
export function PlatformInvoiceTable({
  invoices,
  isPending,
  showShop = true,
  rows = 5,
  className,
}: {
  invoices?: PlatformInvoice[];
  isPending?: boolean;
  // Off on a shop's own detail screen, where every row is the same shop.
  showShop?: boolean;
  rows?: number;
  // Lands on the <table>, not the card around it — the ledger dims its rows
  // while a new page loads, and dimming the pagination you're clicking would
  // be the wrong half.
  className?: string;
}) {
  const columns = columnsFor(showShop);

  return (
    <Table className={className}>
      <InvoiceTableHead showShop={showShop} />
      <TableBody>
        {isPending && <TableSkeleton columns={columns.length} rows={rows} />}

        {invoices?.map((invoice) => (
          // Dimmed, not hidden. A superseded invoice is real history — someone
          // looking for "the one with the screenshot" has to be able to find
          // it — but it is not something anyone can act on any more.
          <TableRow key={invoice.id} className={cn(invoice.status === "void" && "opacity-55")}>
            <TableCell className="font-medium tabular-nums">{invoice.reference}</TableCell>

            {showShop && (
              <TableCell>
                {invoice.shop.id != null ? (
                  <Link
                    href={`/platform/shops/${invoice.shop.id}`}
                    className="flex min-w-0 flex-col gap-0.5 hover:underline"
                  >
                    <span className="truncate font-medium">
                      {invoice.shop.name ?? "Unknown shop"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {invoice.shop.slug ?? `#${invoice.shop.id}`}
                    </span>
                  </Link>
                ) : (
                  // The tenant row is gone; the invoice isn't. Still real money
                  // in the ledger, so it stays legible rather than rendering as
                  // a broken link.
                  <span className={typography.muted}>Shop deleted</span>
                )}
              </TableCell>
            )}

            <TableCell>{invoice.plan_label}</TableCell>

            <TableCell className={cn(typography.muted, "whitespace-nowrap")}>
              {period(invoice)}
            </TableCell>

            <TableCell className={cn(typography.muted, "whitespace-nowrap")}>
              {formatBillingDate(invoice.created_at) ?? "—"}
            </TableCell>

            <TableCell className={typography.numeric}>
              {formatMoney(invoice.amount, invoice.currency)}
            </TableCell>

            <TableCell>
              <div className="flex flex-col items-start gap-1">
                <InvoiceStatusBadge invoice={invoice} />
                {/* Void has two causes that read identically without it: the
                    shop changed plan (or staff changed its billing currency)
                    before paying, versus an intent that expired with no
                    transfer against it. The note is the only thing that says
                    which. */}
                {invoice.status === "void" && invoice.note && (
                  <span
                    className={cn(typography.muted, "max-w-56 text-xs text-pretty")}
                    title={invoice.note}
                  >
                    {invoice.note}
                  </span>
                )}
              </div>
            </TableCell>

            <TableCell className="text-right">
              {invoice.proof_url && (
                <a
                  href={invoice.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Screenshot
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
