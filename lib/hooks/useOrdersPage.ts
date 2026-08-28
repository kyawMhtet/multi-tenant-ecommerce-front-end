"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrdersPage } from "@/lib/api/orders";
import type { OrderFilterParams } from "@/lib/types";

// Same pattern as useProductsPage: previous page's rows stay on screen
// while the next page/filter combo fetches in the background (isFetching,
// not isPending, signals that).
export function useOrdersPage(page: number, perPage: number, filters: OrderFilterParams) {
  return useQuery({
    queryKey: ["orders", "page", page, perPage, filters],
    queryFn: () => getOrdersPage({ page, per_page: perPage, ...filters }),
    placeholderData: keepPreviousData,
  });
}
