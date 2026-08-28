"use client";

import { useMutation } from "@tanstack/react-query";
import { createOnlineOrder } from "@/lib/api/orders";

export function useCreateOnlineOrder() {
  return useMutation({
    mutationFn: createOnlineOrder,
  });
}
