"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dispatchOrder } from "@/lib/api/orders";
import type { DispatchOrderPayload } from "@/lib/types";

// Handing a parcel to a courier. Also used to CHANGE the courier on an
// already-dispatched order — the endpoint overwrites rather than rejecting,
// so there's one mutation for both, not a separate "redispatch".
export function useDispatchOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: DispatchOrderPayload }) =>
      dispatchOrder(id, data),
    onSuccess: () => {
      // Prefix invalidation, same as useCancelOrder: ["orders"] also matches
      // ["orders", id] and every filtered page — and the list shows a "Sent"
      // badge off is_dispatched, so it's stale too, not just the detail.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    // Deliberately does NOT invalidate ["dashboard-summary"]: dispatching
    // moves no money and changes no status, so nothing the summary reports
    // can have changed.
  });
}
