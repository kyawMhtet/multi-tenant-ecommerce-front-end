"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startSubscription } from "@/lib/api/billing";
import type { StartSubscriptionPayload } from "@/lib/types";

/**
 * Begin paying for a plan.
 *
 * The invalidation is NOT "the plan changed" — it hasn't, and the caller must
 * not say it has. It's that the transfer rail raises (or reuses) an invoice,
 * which belongs in the history the billing screen shows underneath. Re-reading
 * ["billing"] afterwards is also how the screen stays honest: it renders the
 * server's subscription state, not an assumption drawn from this call
 * succeeding.
 */
export function useStartSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StartSubscriptionPayload) => startSubscription(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}
