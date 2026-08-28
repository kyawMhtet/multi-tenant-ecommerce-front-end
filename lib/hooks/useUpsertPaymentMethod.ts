"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertPaymentMethod } from "@/lib/api/payments";
import type { UpsertPaymentMethodPayload } from "@/lib/types";

export function useUpsertPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertPaymentMethodPayload) => upsertPaymentMethod(payload),
    onSuccess: () => {
      // Refetch rather than patching the row in place: the server owns
      // qr_url (it's the stored file's URL, not the one we uploaded) and can
      // adjust sort_order, so the returned list is the truth.
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      // What the storefront offers is derived from these rows.
      queryClient.invalidateQueries({ queryKey: ["public-payment-methods"] });
    },
  });
}
