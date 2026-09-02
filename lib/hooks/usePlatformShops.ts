"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPlatformShops } from "@/lib/api/platform-shops";
import type { PlatformShopFilters } from "@/lib/types";

/**
 * The shop directory.
 *
 * The key is ["platform-shops", ...] so suspend/restore can invalidate every
 * page and filter combination at once by prefix, and so ["platform-shops", id]
 * (usePlatformShop) is caught by the same call — a suspension has to move both
 * the row and the detail screen it was fired from.
 *
 * keepPreviousData for the same reason the review queue uses it: acting on a
 * shop shouldn't flash the table back to a skeleton while it refetches.
 */
export function usePlatformShops(page: number, perPage: number, filters: PlatformShopFilters) {
  return useQuery({
    queryKey: ["platform-shops", "page", page, perPage, filters],
    queryFn: () => getPlatformShops({ page, per_page: perPage, ...filters }),
    placeholderData: keepPreviousData,
  });
}
