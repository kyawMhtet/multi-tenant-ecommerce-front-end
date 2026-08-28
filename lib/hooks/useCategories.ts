"use client";

import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/lib/api/categories";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    // Admin-curated and rarely changed, and there's no category CRUD screen
    // in this app yet to invalidate against — a short staleTime avoids
    // refetching on every navigation without pretending this never changes.
    staleTime: 5 * 60 * 1000,
  });
}
