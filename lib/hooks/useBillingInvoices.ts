"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getBillingInvoices } from "@/lib/api/billing";

// Payment history. The key starts with ["billing"] so anything that changes
// the subscription — subscribing, uploading proof, cancelling — invalidates
// this too through React Query's prefix matching, without each mutation
// having to name both keys.
export function useBillingInvoices(page: number) {
  return useQuery({
    queryKey: ["billing", "invoices", page],
    queryFn: () => getBillingInvoices(page),
    placeholderData: keepPreviousData,
  });
}
