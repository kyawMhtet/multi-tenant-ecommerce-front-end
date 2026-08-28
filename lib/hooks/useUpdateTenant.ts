"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTenant } from "@/lib/api/tenant";
import type { UpdateTenantPayload } from "@/lib/types";

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTenantPayload) => updateTenant(payload),
    // The tenant drives the sidebar's shop name and avatar as well as the
    // settings form, so a save has to refresh every reader — not just the
    // screen that triggered it.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
    },
  });
}
