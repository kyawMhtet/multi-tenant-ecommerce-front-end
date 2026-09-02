"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDeliveryProvider } from "@/lib/api/delivery-providers";
import type { StoreDeliveryProviderPayload } from "@/lib/types";

export function useCreateDeliveryProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StoreDeliveryProviderPayload) => createDeliveryProvider(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-providers"] });
    },
  });
}
