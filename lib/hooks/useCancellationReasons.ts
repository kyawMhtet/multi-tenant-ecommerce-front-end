"use client";

import { useQuery } from "@tanstack/react-query";
import { getCancellationReasons } from "@/lib/api/orders";

interface UseCancellationReasonsOptions {
  // The cancel dialog is mounted on every order detail page but opened on
  // almost none of them, so it passes its own open state here rather than
  // making each order view cost an extra request for a list nobody asked
  // to see.
  enabled?: boolean;
}

// The cancel dialog's picker options. A near-static, backend-owned list, so
// it's cached under its own key and shared by every order screen that opens
// the dialog rather than refetched per order.
export function useCancellationReasons({ enabled = true }: UseCancellationReasonsOptions = {}) {
  return useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: getCancellationReasons,
    enabled,
  });
}
