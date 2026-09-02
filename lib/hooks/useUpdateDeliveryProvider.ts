"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDeliveryProvider } from "@/lib/api/delivery-providers";
import type { UpdateDeliveryProviderPayload } from "@/lib/types";

export function useUpdateDeliveryProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDeliveryProviderPayload }) =>
      updateDeliveryProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-providers"] });
    },
  });
}
