"use client";

import { useState } from "react";
import { ExternalLink, Info, ReceiptText } from "lucide-react";
import { useBillingInvoices } from "@/lib/hooks/useBillingInvoices";
import { useBilling } from "@/lib/hooks/useBilling";
import { InvoiceProofField } from "@/components/admin/InvoiceProofField";
import { TableCard } from "@/components/shared/TableCard";
import { TablePagination } from "@/components/shared/TablePagination";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { InvoiceStatusBadge } from "@/components/shared/InvoiceStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeOpenInvoices, formatBillingDate, isInvoicePayable } from "@/lib/billing";
import { formatMoney } from "@/lib/currency";
import type { SubscriptionInvoice } from "@/lib/types";
import { typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const COLUMNS = ["Reference", "Plan", "Period", "Amount", "Status", ""] as const;

// Not "Payment history". The newest row here is routinely an unpaid intent the
// shop raised seconds ago by clicking "Pay by bank transfer" — filing that
// under "history" tells the shop it has paid something it hasn't. "Invoices"
// is the one word that covers a charge raised and a charge settled without
// claiming either.
const TITLE = "Invoices";

function InvoiceTableHead() {
  return (
    <TableHeader>
      <TableRow>
        {COLUMNS.map((column, i) => (
          <TableHead key={column || i} className={i === COLUMNS.length - 1 ? "text-right" : undefined}>
            {column}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

/**
 * The explanation for two live invoices at once — see describeOpenInvoices().
 *
 * Plain muted text rather than one of the noticeTone washes, and that is the
 * considered choice: a notice's colour is the only thing in this app telling
 * the reader how urgently to act, and here there is nothing to act on. An
 * amber strip would manufacture exactly the alarm this sentence exists to
 * remove, and a third tone meaning "merely explaining" is the tone system
 * coming apart.
 */
function OpenInvoicesNote({ note }: { note: string }) {
  return (
    <div className="flex gap-3 border-b px-5 py-4">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className={cn(typography.muted, "text-pretty")}>{note}</p>
    </div>
  );
}

function period(invoice: SubscriptionInvoice): string {
  const from = formatBillingDate(invoice.period_start);
  const to = formatBillingDate(invoice.period_end);
  if (from && to) return `${from} – ${to}`;
  return from ?? to ?? "—";
}

/**
 * Every invoice this shop has been raised, paid or not.
 *
 * A shop can hold TWO payable invoices at once now: a transfer it has already
 * sent and uploaded proof for is no longer voided when it asks to pay for a
 * different plan, because voiding it hid real money from the reviewers who
 * have to match it. Both rows render correctly on their own — the explanation
 * for why both are outstanding is OpenInvoicesNote above.
 *
 * The status column is the only thing in this app allowed to say an invoice is
 * settled, and it says so only when the server does — invoiceStatusLabel()
 * splits pending into "Awaiting review" (we have a screenshot) and "Awaiting
 * payment" (we don't), neither of which is "Paid". An unpaid transfer keeps
 * its upload control here, so a shop that closed the dialog after subscribing
 * can still come back and send the screenshot.
 */
export function BillingInvoiceHistory() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useBillingInvoices(page);

  // An unpaid invoice is sitting in front of platform staff, in their console,
  // in their browser — and their ruling reaches this tab through nothing at
  // all. The query above already polls itself for the status column; this is
  // the rest of the screen, which the same approval also changes: the status
  // card, the plan grid, and the app-wide subscription banner.
  //
  // Subscribing to the SAME ["billing"] entry adds a refetch interval to it
  // rather than issuing a second request — the exact move BillingReturnNotice
  // makes for the Stripe return trip, for the same reason. This component is
  // the only one on the screen that knows an invoice is outstanding, so it
  // owns the poll that fact implies, without rendering any of the data it
  // keeps fresh or claiming anything about it.
  //
  // Reads the CURRENT page, so paging back through old history stops the poll.
  // That's correct rather than a gap: unpaid invoices are newest-first on page
  // one, and a shop reading page three isn't watching for a ruling.
  const isAwaitingReview = data?.data.some(isInvoicePayable) ?? false;
  useBilling({ pollWhileAwaitingReview: isAwaitingReview });

  // Scoped to the CURRENT page, for the same reason the poll above is: open
  // invoices are newest-first on page one, so a shop paging back through old
  // rows is reading history and has nothing outstanding to explain.
  const openInvoicesNote = data ? describeOpenInvoices(data.data) : null;

  if (error) {
    return <ApiErrorState error={error} fallback="Could not load your invoices." />;
  }

  if (isPending) {
    return (
      <TableCard title={TITLE}>
        <Table>
          <InvoiceTableHead />
          <TableBody>
            <TableSkeleton columns={COLUMNS.length} rows={3} />
          </TableBody>
        </Table>
      </TableCard>
    );
  }

  if (data.data.length === 0) {
    return (
      <TableCard title={TITLE}>
        <EmptyState
          icon={ReceiptText}
          variant="inline"
          title="No invoices yet"
          description="Invoices appear here once you choose a plan."
        />
      </TableCard>
    );
  }

  return (
    <TableCard
      title={TITLE}
      description="Everything billed to your shop, paid or not."
      footer={
        <TablePagination
          meta={data.meta}
          page={page}
          onPageChange={setPage}
          label="invoices"
        />
      }
    >
      {openInvoicesNote && <OpenInvoicesNote note={openInvoicesNote} />}

      <Table>
        <InvoiceTableHead />
        <TableBody>
          {data.data.map((invoice) => (
            // Shown, not hidden. A shop that saw an invoice and then can't find
            // it assumes something went wrong — dimming says "this one no
            // longer applies" while leaving the history honest.
            <TableRow key={invoice.id} className={cn(invoice.status === "void" && "opacity-55")}>
              <TableCell className="font-medium">{invoice.reference}</TableCell>
              <TableCell>{invoice.plan_label}</TableCell>
              <TableCell className={cn(typography.muted, "whitespace-nowrap")}>
                {period(invoice)}
              </TableCell>
              <TableCell className={typography.numeric}>
                {formatMoney(invoice.amount, invoice.currency)}
              </TableCell>
              <TableCell>
                <InvoiceStatusBadge invoice={invoice} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {/* Renders nothing for a paid or card invoice — see the
                      component's own guard. */}
                  <InvoiceProofField invoice={invoice} showNote={false} />
                  {invoice.status === "paid" && invoice.proof_url && (
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  );
}
