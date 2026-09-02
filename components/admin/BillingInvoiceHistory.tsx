"use client";

import { useState } from "react";
import { ExternalLink, ReceiptText } from "lucide-react";
import { useBillingInvoices } from "@/lib/hooks/useBillingInvoices";
import { InvoiceProofField } from "@/components/admin/InvoiceProofField";
import { TableCard } from "@/components/shared/TableCard";
import { TablePagination } from "@/components/shared/TablePagination";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatBillingDate, invoiceStatusLabel, invoiceStatusStyle } from "@/lib/billing";
import { formatMoney } from "@/lib/currency";
import type { SubscriptionInvoice } from "@/lib/types";
import { statusPill, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const COLUMNS = ["Reference", "Plan", "Period", "Amount", "Status", ""] as const;

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

function period(invoice: SubscriptionInvoice): string {
  const from = formatBillingDate(invoice.period_start);
  const to = formatBillingDate(invoice.period_end);
  if (from && to) return `${from} – ${to}`;
  return from ?? to ?? "—";
}

/**
 * Every charge this shop has been raised, paid or not.
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

  if (error) {
    return <ApiErrorState error={error} fallback="Could not load your payment history." />;
  }

  if (isPending) {
    return (
      <TableCard title="Payment history">
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
      <TableCard title="Payment history">
        <EmptyState
          icon={ReceiptText}
          variant="inline"
          title="No payments yet"
          description="Charges appear here once you start a plan."
        />
      </TableCard>
    );
  }

  return (
    <TableCard
      title="Payment history"
      description="Every charge raised against your shop."
      footer={
        <TablePagination
          meta={data.meta}
          page={page}
          onPageChange={setPage}
          label="invoices"
        />
      }
    >
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
                <Badge
                  variant="outline"
                  className={cn(statusPill, invoiceStatusStyle(invoice.status))}
                >
                  {invoiceStatusLabel(invoice)}
                </Badge>
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
