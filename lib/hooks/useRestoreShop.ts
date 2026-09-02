"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreShop } from "@/lib/api/platform-shops";

// Clears the suspension and its reason together. Same invalidation as
// useSuspendShop — the two are one toggle from the reader's point of view.
export function useRestoreShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => restoreShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-shops"] });
    },
  });
}
