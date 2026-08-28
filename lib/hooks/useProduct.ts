"use client";

import { useQuery } from "@tanstack/react-query";
import { getProduct } from "@/lib/api/products";

export function useProduct(id: number | string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => getProduct(id),
  });
}
