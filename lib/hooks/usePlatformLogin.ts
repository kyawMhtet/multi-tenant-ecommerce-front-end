"use client";

import { useMutation } from "@tanstack/react-query";
import { platformLogin } from "@/lib/api/platform-auth";

// Platform staff sign-in. No cache invalidation on success: the caller stores
// the token first (under the platform key, never the shop one) and then
// navigates, and the platform screens mount fresh behind that.
export function usePlatformLogin() {
  return useMutation({
    mutationFn: platformLogin,
  });
}
