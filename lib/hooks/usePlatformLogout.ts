"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { platformLogout } from "@/lib/api/platform-auth";

// Revokes the token server-side. The caller clears local storage either way —
// see lib/api/platform-auth.ts — so this clears the cache on settle rather
// than on success, or a failed sign-out would leave another admin's queue
// sitting in the cache behind the login screen.
export function usePlatformLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: platformLogout,
    onSettled: () => {
      queryClient.clear();
    },
  });
}
