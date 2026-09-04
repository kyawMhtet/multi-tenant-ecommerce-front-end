"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAwaitingTransferInvoices } from "@/lib/api/platform-billing";

export function useAwaitingTransferInvoices(page: number, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["platform-billing", "awaiting-transfer", page],
    queryFn: () => getAwaitingTransferInvoices(page),
    enabled,
    placeholderData: keepPreviousData,
  });
}
