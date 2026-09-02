"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelSubscription } from "@/lib/api/billing";

// Cancels at period end — access continues until then, so the refetched
// subscription still reports a future access_ends_at. The screen reads that
// back rather than assuming anything stopped.
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}
