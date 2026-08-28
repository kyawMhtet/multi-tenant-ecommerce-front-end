"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addVariant } from "@/lib/api/products";
import type { AddVariantPayload } from "@/lib/types";

export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: number | string; data: AddVariantPayload }) =>
      addVariant(productId, data),
    // Invalidating ["products"] (not exact) also matches ["products", id] —
    // the edit page's variant table refreshes to show the new row.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
