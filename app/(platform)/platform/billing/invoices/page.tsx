"use client";

import { useState } from "react";
import { ReceiptText, SearchX } from "lucide-react";
import { usePlatformInvoices } from "@/lib/hooks/usePlatformInvoices";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { TablePagination } from "@/components/shared/TablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { PlatformInvoiceFilterBar } from "@/components/platform/PlatformInvoiceFilterBar";
import { PlatformInvoiceTable } from "@/components/platform/PlatformInvoiceTable";
import { Button } from "@/components/ui/button";
import type { PlatformInvoiceFilters } from "@/lib/types";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const PER_PAGE_OPTIONS = [25, 50, 100] as const;

/**
 * The invoice ledger — every charge on the platform, newest first.
 *
 * Deliberately a SEPARATE screen from /platform/billing, and not a filter on
 * it. The two answer different questions: the queue is work waiting to be done
 * (unpaid transfers, actionable first, one card per claim so the screenshot
 * sits beside the amount), this is history you reconcile against a bank
 * statement. Merging them into one filtered table would bury the queue behind
 * a filter nobody remembers to reset, and the queue is the one with money
 * waiting on it.
 *
 * "void" appears here and never in the queue: the shop asked for a different
 * plan, or staff changed its billing currency, before paying. It renders muted
 * and labelled "Superseded" — real history to find, nothing to act on.
 */
export default function PlatformInvoiceLedgerPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(PER_PAGE_OPTIONS[0]);

  const [selected, setSelected] = useState<PlatformInvoiceFilters>({});
  // Raw text, debounced like a search box: typing "1" on the way to "12" must
  // not fire a request for shop 1, and a half-cleared box must stay empty
  // rather than snapping back to a number.
  const [shopIdInput, setShopIdInput] = useState("");
  const debouncedShopId = useDebouncedValue(shopIdInput.trim(), 400);
  const shopId = Number(debouncedShopId);
  const tenantId =
    debouncedShopId !== "" && Number.isInteger(shopId) && shopId > 0 ? shopId : undefined;

  const filters: PlatformInvoiceFilters = {
    ...selected,
    ...(tenantId !== undefined ? { tenant_id: tenantId } : {}),
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  // Render-phase page reset, same pattern as the products and shops lists — an
  // effect would commit one render holding the new filters against the old
  // page number, and fetch a page nobody asked for.
  const filterKey = JSON.stringify(filters);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data, isPending, isFetching, error } = usePlatformInvoices(page, perPage, filters);
  const invoices = data?.data;
  const meta = data?.meta;
  const isEmpty = invoices !== undefined && invoices.length === 0;

  function clearFilters() {
    setSelected({});
    setShopIdInput("");
  }

  function handlePerPageChange(value: number) {
    setPerPage(value);
    setPage(1);
  }

  return (
    <PageContainer size="full">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Invoice ledger"
          eyebrow="Billing"
          description={
            meta
              ? `${meta.total} ${meta.total === 1 ? "invoice" : "invoices"} ${
                  hasActiveFilters ? "match your filters" : "across every shop"
                }`
              : undefined
          }
        />

        <PlatformInvoiceFilterBar
          filters={selected}
          onFiltersChange={setSelected}
          shopIdInput={shopIdInput}
          onShopIdInputChange={setShopIdInput}
          isFetching={isFetching && !isPending}
          onClear={clearFilters}
          isFiltered={hasActiveFilters}
        />

        <ApiErrorState error={error} fallback="Could not load the invoice ledger." />

        {!error && isPending && (
          <TableCard>
            <PlatformInvoiceTable isPending />
          </TableCard>
        )}

        {isEmpty &&
          (hasActiveFilters ? (
            <EmptyState
              icon={SearchX}
              title="No invoices match your filters"
              description="Try a wider date range, or clear the filters to see everything."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className={controls.button}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="No invoices yet"
              description="Charges appear here as soon as a shop starts a plan."
            />
          ))}

        {invoices !== undefined && invoices.length > 0 && meta && (
          <TableCard
            footer={
              <TablePagination
                meta={meta}
                page={page}
                onPageChange={setPage}
                perPage={perPage}
                onPerPageChange={handlePerPageChange}
                perPageOptions={PER_PAGE_OPTIONS}
                label="invoices"
              />
            }
          >
            <PlatformInvoiceTable
              invoices={invoices}
              className={cn(isFetching && !isPending && "opacity-60 transition-opacity")}
            />
          </TableCard>
        )}
      </div>
    </PageContainer>
  );
}
