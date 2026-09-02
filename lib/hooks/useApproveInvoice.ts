"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveInvoice } from "@/lib/api/platform-billing";

// Approving drops the invoice out of the pending queue, so the list is
// invalidated rather than patched — and the prefix ["platform-billing"]
// catches every page of it, not just the one the reviewer was looking at.
//
// The ledger is a separate prefix and has to be named separately: the same
// invoice is a row there too, and it has just changed from "Awaiting review" to
// "Paid". Missing it would leave the reconciliation screen quietly disagreeing
// with the queue about whether money arrived. Approving also moves the shop
// onto the plan it paid for, which is what ["platform-shops"] is for.
export function useApproveInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => approveInvoice(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-billing"] });
      queryClient.invalidateQueries({ queryKey: ["platform-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["platform-shops"] });
    },
  });
}
