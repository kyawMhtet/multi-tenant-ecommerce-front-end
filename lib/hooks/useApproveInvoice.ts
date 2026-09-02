"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveInvoice } from "@/lib/api/platform-billing";

// Approving drops the invoice out of the pending queue, so the list is
// invalidated rather than patched — and the prefix ["platform-billing"]
// catches every page of it, not just the one the reviewer was looking at.
export function useApproveInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => approveInvoice(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-billing"] });
    },
  });
}
