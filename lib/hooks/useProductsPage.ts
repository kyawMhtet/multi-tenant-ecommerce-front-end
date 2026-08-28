"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getProductsPage } from "@/lib/api/products";

// The exact wire-shaped filter object — only keys actually being sent, in
// the literal values the API expects. Reused as-is for both the query key
// and the request params below, so the cache key can never drift from what
// was actually requested.
export interface ProductFilterParams {
  search?: string;
  category_id?: number;
  is_active?: "true" | "false";
  low_stock?: "true";
}

// keepPreviousData: the previous page's rows stay on screen (and the query
// key still starts with ["products"], so create/update/delete invalidation
// still reaches this) while the next page loads in the background —
// isFetching (not isPending) is what tells the page a new request is in
// flight, for a "still talking to the backend" indicator instead of a
// jarring full-table loading flash on every click.
export function useProductsPage(page: number, perPage: number, filters: ProductFilterParams) {
  return useQuery({
    queryKey: ["products", "page", page, perPage, filters],
    queryFn: () => getProductsPage({ page, per_page: perPage, ...filters }),
    placeholderData: keepPreviousData,
  });
}
