"use client";

import { useQuery } from "@tanstack/react-query";
import { getPaymentMethods } from "@/lib/api/payments";

// Admin-side: every method the platform offers, configured or not.
export function usePaymentMethods({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: getPaymentMethods,
    enabled,
  });
}
