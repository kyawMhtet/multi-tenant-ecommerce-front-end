"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct } from "@/lib/api/products";
import type { UpdateProductPayload } from "@/lib/types";

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateProductPayload }) =>
      updateProduct(id, data),
    // Invalidating ["products"] (not exact) also matches ["products", id] —
    // one call refreshes both the list and this product's own query.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
