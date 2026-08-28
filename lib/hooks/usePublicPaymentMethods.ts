"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicPaymentMethods } from "@/lib/api/payments";

// Storefront-side: the shop's enabled methods, scoped by the tenant
// subdomain the request is made from (see getPublicPaymentMethods).
export function usePublicPaymentMethods() {
  return useQuery({
    queryKey: ["public-payment-methods"],
    queryFn: getPublicPaymentMethods,
    // Rarely changes mid-session, and the cart drawer mounts on every
    // storefront page — no reason to refetch it on each navigation.
    staleTime: 5 * 60 * 1000,
  });
}
