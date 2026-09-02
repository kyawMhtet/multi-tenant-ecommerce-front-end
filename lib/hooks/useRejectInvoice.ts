"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rejectInvoice } from "@/lib/api/platform-billing";

// A rejected invoice stays unpaid but leaves the queue (its status moves to
// 'failed'), so the same invalidation as approve applies.
export function useRejectInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectInvoice(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-billing"] });
    },
  });
}
