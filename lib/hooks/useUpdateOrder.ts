"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrder } from "@/lib/api/orders";
import type { UpdateOrderPayload } from "@/lib/types";

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateOrderPayload }) =>
      updateOrder(id, data),
    onSuccess: () => {
      // Invalidating ["orders"] (not exact) also matches ["orders", id] and
      // ["orders", "page", ...] — one call refreshes this order, the list,
      // and any filtered page of it.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      // Accepting an order changes today's paid totals.
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
