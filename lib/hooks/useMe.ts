"use client";

import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/me";

export function useMe({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled,
    retry: false,
    refetchOnMount: "always",
  });
}
