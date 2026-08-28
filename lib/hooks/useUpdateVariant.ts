"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateVariant } from "@/lib/api/products";
import type { UpdateVariantPayload } from "@/lib/types";

export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      variantId,
      data,
    }: {
      productId: number | string;
      variantId: number;
      data: UpdateVariantPayload;
    }) => updateVariant(productId, variantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
