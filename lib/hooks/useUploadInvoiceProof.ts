"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadInvoiceProof } from "@/lib/api/billing";

/**
 * Attach a transfer screenshot to an invoice.
 *
 * The invoice comes back still 'pending', and nothing here may present it
 * otherwise. Refetching rather than patching the row in place matters for
 * exactly that reason: the server owns proof_url (it's the stored file's URL,
 * not the one we uploaded) and it owns `status`, which an optimistic update
 * would be tempted to advance.
 */
export function useUploadInvoiceProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, proof }: { invoiceId: number; proof: File }) =>
      uploadInvoiceProof(invoiceId, proof),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}
