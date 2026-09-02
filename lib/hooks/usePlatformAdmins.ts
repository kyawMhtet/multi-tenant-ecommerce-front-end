"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPlatformAdmins } from "@/lib/api/platform-admins";

// Staff accounts. Keyed under ["platform-admins", page] so create/deactivate/
// reactivate can invalidate every page with the bare ["platform-admins"]
// prefix — the same convention ["platform-billing", "pending", page] uses.
export function usePlatformAdmins(page: number) {
  return useQuery({
    queryKey: ["platform-admins", page],
    queryFn: () => getPlatformAdmins(page),
    placeholderData: keepPreviousData,
  });
}
