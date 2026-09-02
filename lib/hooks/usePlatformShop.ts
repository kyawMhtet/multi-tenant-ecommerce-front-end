"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlatformShop } from "@/lib/api/platform-shops";

// One shop in full. ["platform-shops", id] so the same prefix invalidation
// that refreshes the directory refreshes this too — see usePlatformShops.
export function usePlatformShop(id: number | string) {
  return useQuery({
    queryKey: ["platform-shops", id],
    queryFn: () => getPlatformShop(id),
  });
}
