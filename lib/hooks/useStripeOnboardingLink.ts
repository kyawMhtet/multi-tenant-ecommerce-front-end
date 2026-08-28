"use client";

import { useMutation } from "@tanstack/react-query";
import { createStripeOnboardingLink } from "@/lib/api/payments";

// A mutation, not a query: it mints a single-use onboarding link, so it must
// only run when the shop actually clicks Connect.
export function useStripeOnboardingLink() {
  return useMutation({
    mutationFn: createStripeOnboardingLink,
  });
}
