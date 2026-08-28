"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicShop } from "@/lib/api/storefront";

interface UsePublicShopOptions {
  // The cart drawer is mounted for the whole storefront, including the
  // product page — which already has this payload embedded in its own
  // response and must not fetch it a second time. Passing `enabled` lets
  // the drawer hold off until the customer actually opens it, by which
  // point usePublicProduct has seeded this exact cache entry.
  enabled?: boolean;
}

// Storefront-only — the request is scoped by the tenant subdomain it's made
// from (see getPublicShop). The product page already receives this payload
// embedded in its own response, so it should read that rather than call
// this a second time.
export function usePublicShop({ enabled = true }: UsePublicShopOptions = {}) {
  return useQuery({
    queryKey: ["public-shop"],
    queryFn: getPublicShop,
    enabled,
  });
}
