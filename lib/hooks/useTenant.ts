"use client";

import { useQuery } from "@tanstack/react-query";
import { getTenant } from "@/lib/api/tenant";

export function useTenant() {
  return useQuery({
    queryKey: ["tenant"],
    queryFn: getTenant,
  });
}
