"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restockVariant } from "@/lib/api/products";
import type { RestockPayload } from "@/lib/types";

export function useRestockVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      variantId,
      data,
    }: {
      productId: number | string;
      variantId: number;
      data: RestockPayload;
    }) => restockVariant(productId, variantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
