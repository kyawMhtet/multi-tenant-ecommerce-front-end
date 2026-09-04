"use client";

import { useQuery } from "@tanstack/react-query";
import { getStaff } from "@/lib/api/staff";

export function useStaff({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["staff"],
    queryFn: getStaff,
    enabled,
  });
}
