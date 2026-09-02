"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { usePendingInvoices } from "@/lib/hooks/usePendingInvoices";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { TablePagination } from "@/components/shared/TablePagination";
import { PendingInvoiceCard } from "@/components/platform/PendingInvoiceCard";
import { Skeleton } from "@/components/ui/skeleton";
import { surface } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={cn(surface.panel, "flex flex-col gap-5 p-5")}>
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-7 w-28" />
          </div>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-40 w-64" />
        </div>
      ))}
    </div>
  );
}

/**
 * The bank-transfer review queue.
 *
 * This is the manual rail's equivalent of a payment webhook — the only path by
 * which a transfer becomes a paid plan — so it's laid out as a review queue
 * rather than a table: one card per claim, big enough to hold the screenshot
 * next to the amount and the reference the reviewer is matching against a bank
 * statement.
 *
 * The queue is everything UNPAID, which means it also carries invoices with no
 * screenshot (a shop that asked for details and went quiet) and ones already
 * rejected once (still unpaid, so the shop can transfer again). Both stay
 * visible on purpose.
 */
export default function PlatformBillingQueuePage() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = usePendingInvoices(page);

  return (
    <PageContainer size="lg">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Bank transfers"
          eyebrow="Review queue"
          description="Shops claiming they've paid by transfer. Check each one against the bank statement before approving."
        />

        <ApiErrorState error={error} fallback="Could not load the review queue." />

        {!error && isPending && <QueueSkeleton />}

        {data && data.data.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="Nothing waiting"
            description="No shop is currently waiting on a transfer to be reviewed."
          />
        )}

        {data && data.data.length > 0 && (
          <>
            <div className="flex flex-col gap-4">
              {data.data.map((invoice) => (
                <PendingInvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </div>

            <div className={cn(surface.panel, "px-5 py-3")}>
              <TablePagination
                meta={data.meta}
                page={page}
                onPageChange={setPage}
                label="transfers"
              />
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
