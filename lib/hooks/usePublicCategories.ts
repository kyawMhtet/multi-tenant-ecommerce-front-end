"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicCategories } from "@/lib/api/storefront";

// Storefront counterpart of useCategories — hits the unauthenticated
// /public/categories route, scoped by the tenant subdomain (see
// getPublicCategories). Same "small, admin-curated, rarely changes"
// reasoning for the staleTime, and there's no category CRUD screen to
// invalidate against.
export function usePublicCategories() {
  return useQuery({
    queryKey: ["public-categories"],
    queryFn: getPublicCategories,
    staleTime: 5 * 60 * 1000,
  });
}
