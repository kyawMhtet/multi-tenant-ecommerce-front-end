"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrder } from "@/lib/api/orders";

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    // A sale deducts stock from every variant it touched — invalidating
    // ["products"] refreshes the POS picker's current_stock automatically,
    // replacing the manual reload-token bump this used to need.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
