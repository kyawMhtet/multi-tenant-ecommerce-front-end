"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelOrder } from "@/lib/api/orders";
import type { CancelOrderPayload } from "@/lib/types";

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: CancelOrderPayload }) =>
      cancelOrder(id, data),
    onSuccess: () => {
      // Same prefix invalidation as useUpdateOrder: ["orders"] also matches
      // ["orders", id] and every filtered page.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      // Cancelling a paid order both removes it from today's takings and
      // adds it to what the shop owes back, so the summary is now wrong on
      // two counts.
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
