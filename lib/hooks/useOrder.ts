"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrder } from "@/lib/api/orders";

export function useOrder(id: number | string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => getOrder(id),
  });
}
