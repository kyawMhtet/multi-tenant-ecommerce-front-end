"use client";

import { useQuery } from "@tanstack/react-query";
import { getDeliveryProviders } from "@/lib/api/delivery-providers";

// The shop's couriers. Read by two very different screens — the settings
// list that maintains them, and the dispatch dialog's picker — so it's
// cached under one key and shared rather than fetched per screen.
interface UseDeliveryProvidersOptions {
  // The dispatch dialog is mounted on every delivery order but opened on
  // few of them, so it passes its own open state here rather than making
  // each order view cost a request for a picker nobody looked at. Same
  // arrangement as useCancellationReasons.
  enabled?: boolean;
}

export function useDeliveryProviders({ enabled = true }: UseDeliveryProvidersOptions = {}) {
  return useQuery({
    queryKey: ["delivery-providers"],
    queryFn: getDeliveryProviders,
    enabled,
  });
}
