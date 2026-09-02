"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setBillingCurrency } from "@/lib/api/platform-billing";
import type { BillingCurrency } from "@/lib/types";

/**
 * Change which currency a shop is billed in — or pass null to go back to
 * following its selling currency.
 *
 * Three prefixes, because this touches three screens. The obvious one is
 * ["platform-shops"] (the shop's own row and detail). The other two are the
 * consequence people forget: changing the currency VOIDS every pending manual
 * invoice on that subscription, since they were raised in the old currency and
 * can never be paid now. Leaving those cached would keep a dead transfer in
 * the review queue for someone to approve.
 */
export function useSetBillingCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      currency,
    }: {
      subscriptionId: number;
      currency: BillingCurrency | null;
    }) => setBillingCurrency(subscriptionId, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-shops"] });
      queryClient.invalidateQueries({ queryKey: ["platform-billing"] });
      queryClient.invalidateQueries({ queryKey: ["platform-invoices"] });
    },
  });
}
