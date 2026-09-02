"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deactivatePlatformAdmin } from "@/lib/api/platform-admins";

/**
 * Revoke a staff account's access. Not deletion — the row stays, its tokens
 * stay, and reactivating restores it without a fresh sign-in.
 *
 * Self-deactivation is refused server-side with a 422 whose reason is
 * "billing_action_unavailable" (nothing there is fixed by paying, so
 * ApiErrorState renders it as a plain message rather than an upgrade prompt).
 * The staff screen also disables the button on your own row, but that's
 * courtesy — this check is the real guard, and it's the one that stops the
 * last active admin locking every human out of the payment queue.
 */
export function useDeactivatePlatformAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deactivatePlatformAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admins"] });
    },
  });
}
