"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { getPublicProducts } from "@/lib/api/storefront";

// The user-controlled filter subset, reused as-is for both the query key and
// the request params so the cache key can't drift from what was requested
// (same idea as ProductFilterParams on the admin side).
export interface PublicProductsFilters {
  search?: string;
  category_id?: number;
}

// The storefront catalog grid. useInfiniteQuery (the first in this app) is
// what backs the "Load more" button: each fetched page is *appended* to
// data.pages rather than replacing the previous one, and getNextPageParam
// reads the paginator's own meta to know when there's nothing left.
//
// placeholderData: keepPreviousData keeps the current results on screen
// while a filter change refetches from page 1 — same "no jarring flash"
// feel as useProductsPage on the admin side. A new filters object makes a
// new query key (React Query hashes it deterministically, so a structurally
// equal object is a cache hit), which resets pagination to page 1 on its
// own — no page state to manage here.
const PER_PAGE = 12;

export function usePublicProducts(filters: PublicProductsFilters) {
  return useInfiniteQuery({
    queryKey: ["public-products", filters],
    queryFn: ({ pageParam }) =>
      getPublicProducts({ ...filters, page: pageParam, per_page: PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
    placeholderData: keepPreviousData,
  });
}
