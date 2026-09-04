"use client";

import { useState } from "react";
import { Inbox, MailQuestion } from "lucide-react";
import { usePendingInvoices } from "@/lib/hooks/usePendingInvoices";
import { useAwaitingTransferInvoices } from "@/lib/hooks/useAwaitingTransferInvoices";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { TablePagination } from "@/components/shared/TablePagination";
import { PendingInvoiceCard } from "@/components/platform/PendingInvoiceCard";
import { AwaitingTransferCard } from "@/components/platform/AwaitingTransferCard";
import {
  InvoiceQueueTabs,
  type InvoiceQueueView,
} from "@/components/platform/InvoiceQueueTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { surface } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function QueueSkeleton({ withProof = true }: { withProof?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={cn(surface.panel, "flex flex-col gap-5 p-5")}>
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-7 w-28" />
          </div>
          <Skeleton className="h-14 w-full" />
          <Skeleton className={withProof ? "h-40 w-64" : "h-10 w-full"} />
        </div>
      ))}
    </div>
  );
}

const DESCRIPTIONS: Record<InvoiceQueueView, string> = {
  review:
    "Shops claiming they've paid by transfer. Check each one against the bank statement before approving.",
  awaiting:
    "Shops that asked how to pay and haven't sent anything. Nothing here is waiting on your judgement — but a transfer you spot on the statement can still be settled.",
};

/**
 * The manual rail's two jobs, split.
 *
 * "To review" is the queue: every row has a screenshot and a decision to make.
 * "Awaiting transfer" is a chase list — same invoices, no proof — and it leads
 * with the shop rather than the invoice, because the action there is to contact
 * someone rather than to rule on anything.
 *
 * Both queries stay mounted whichever tab is showing, so the counts on the tabs
 * are real rather than "the one you happen to be looking at".
 */
export default function PlatformBillingQueuePage() {
  const [view, setView] = useState<InvoiceQueueView>("review");
  const [reviewPage, setReviewPage] = useState(1);
  const [awaitingPage, setAwaitingPage] = useState(1);

  const review = usePendingInvoices(reviewPage);
  const awaiting = useAwaitingTransferInvoices(awaitingPage);

  const active = view === "review" ? review : awaiting;
  const page = view === "review" ? reviewPage : awaitingPage;
  const setPage = view === "review" ? setReviewPage : setAwaitingPage;

  return (
    <PageContainer size="lg">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Bank transfers"
          eyebrow="Review queue"
          description={DESCRIPTIONS[view]}
        />

        <InvoiceQueueTabs
          value={view}
          onChange={setView}
          counts={{ review: review.data?.meta.total, awaiting: awaiting.data?.meta.total }}
        />

        <ApiErrorState
          error={active.error}
          fallback={
            view === "review"
              ? "Could not load the review queue."
              : "Could not load the chase list."
          }
        />

        {!active.error && active.isPending && <QueueSkeleton withProof={view === "review"} />}

        {active.data?.data.length === 0 &&
          (view === "review" ? (
            <EmptyState
              icon={Inbox}
              title="Nothing to review"
              description="No shop is currently waiting on a transfer to be ruled on."
            />
          ) : (
            <EmptyState
              icon={MailQuestion}
              title="Nobody to chase"
              description="Every shop that asked for bank details has sent something."
            />
          ))}

        {active.data && active.data.data.length > 0 && (
          <>
            <div className="flex flex-col gap-4">
              {active.data.data.map((invoice) =>
                view === "review" ? (
                  <PendingInvoiceCard key={invoice.id} invoice={invoice} />
                ) : (
                  <AwaitingTransferCard key={invoice.id} invoice={invoice} />
                ),
              )}
            </div>

            <div className={cn(surface.panel, "px-5 py-3")}>
              <TablePagination
                meta={active.data.meta}
                page={page}
                onPageChange={setPage}
                label={view === "review" ? "transfers" : "shops"}
              />
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
