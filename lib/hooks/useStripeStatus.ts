"use client";

import { useQuery } from "@tanstack/react-query";
import { getStripeStatus } from "@/lib/api/payments";

// Deliberately left at React Query's default staleTime of 0, so returning
// from Stripe's hosted onboarding refetches on mount and on window focus.
// Coming back from that flow is not proof it was completed — the status
// endpoint is the only thing that says whether cards can be charged.
export function useStripeStatus() {
  return useQuery({
    queryKey: ["stripe-status"],
    queryFn: getStripeStatus,
    // A shop that never touches Stripe shouldn't see a failed request
    // retried three times behind a page that otherwise works.
    retry: 1,
  });
}
