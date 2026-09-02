"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reactivatePlatformAdmin } from "@/lib/api/platform-admins";

// Restores the account as it was. Their existing tokens start working again on
// the next request, so there's no sign-in for them to do.
export function useReactivatePlatformAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reactivatePlatformAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admins"] });
    },
  });
}
