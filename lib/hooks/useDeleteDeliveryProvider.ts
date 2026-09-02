"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDeliveryProvider } from "@/lib/api/delivery-providers";

export function useDeleteDeliveryProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteDeliveryProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-providers"] });
      // Past orders are NOT invalidated on purpose: they snapshot
      // delivery_provider_name, so a deleted courier's name still renders
      // correctly on every order it was used for. Nothing to refetch.
    },
  });
}
