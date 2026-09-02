"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refundOrder } from "@/lib/api/orders";
import type { RefundOrderPayload } from "@/lib/types";

export function useRefundOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data?: RefundOrderPayload }) =>
      refundOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      // This is the one thing that clears a refund off the dashboard's
      // "owed" card, so the summary has to be refetched or the shop keeps
      // being told about money they've already sent back.
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
