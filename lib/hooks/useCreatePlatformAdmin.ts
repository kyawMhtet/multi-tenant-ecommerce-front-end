"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPlatformAdmin } from "@/lib/api/platform-admins";
import type { CreatePlatformAdminPayload } from "@/lib/types";

// A new account can land on any page of the list (it's ordered by name), so
// the whole prefix is invalidated rather than the current page patched.
export function useCreatePlatformAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePlatformAdminPayload) => createPlatformAdmin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admins"] });
    },
  });
}
