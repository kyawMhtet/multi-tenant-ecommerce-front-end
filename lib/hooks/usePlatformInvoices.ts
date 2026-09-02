"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPlatformInvoices } from "@/lib/api/platform-billing";
import type { PlatformInvoiceFilters } from "@/lib/types";

/**
 * The invoice ledger — history to reconcile against a bank statement.
 *
 * Its own key prefix, NOT ["platform-billing"], because it isn't the review
 * queue: the two screens answer different questions and are paged and filtered
 * independently. The mutations that rule on an invoice invalidate both
 * prefixes, since approving a transfer changes what this table says about it.
 */
export function usePlatformInvoices(
  page: number,
  perPage: number,
  filters: PlatformInvoiceFilters,
) {
  return useQuery({
    queryKey: ["platform-invoices", "page", page, perPage, filters],
    queryFn: () => getPlatformInvoices({ page, per_page: perPage, ...filters }),
    placeholderData: keepPreviousData,
  });
}
