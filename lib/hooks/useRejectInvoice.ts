"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rejectInvoice } from "@/lib/api/platform-billing";

// A rejected invoice stays unpaid but leaves the queue (its status moves to
// 'failed'), so the same invalidation as approve applies — including the
// ledger, where that row now reads "Rejected".
//
// No ["platform-shops"] here, unlike approve: a rejection deliberately doesn't
// touch the subscription. The shop's plan is exactly what it was.
export function useRejectInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectInvoice(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-billing"] });
      queryClient.invalidateQueries({ queryKey: ["platform-invoices"] });
    },
  });
}
