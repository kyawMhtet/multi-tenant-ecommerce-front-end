"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPendingInvoices } from "@/lib/api/platform-billing";

// The review queue. keepPreviousData so ruling on an invoice near the bottom
// of page 2 doesn't flash the table back to a skeleton while it refetches.
export function usePendingInvoices(page: number) {
  return useQuery({
    queryKey: ["platform-billing", "pending", page],
    queryFn: () => getPendingInvoices(page),
    placeholderData: keepPreviousData,
  });
}
