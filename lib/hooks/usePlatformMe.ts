"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlatformMe } from "@/lib/api/platform-auth";

/**
 * Who is signed into the platform console — and, more importantly, whether
 * the stored token is still valid.
 *
 * The (platform) layout gates on this rather than on the mere presence of a
 * token in localStorage, because a revoked or expired token looks identical
 * to a good one from the client's side. `enabled` lets the layout skip the
 * request entirely on the login screen, where there is no token to check.
 *
 * retry: false so a 401 bounces to the login screen immediately instead of
 * being retried three times behind a blank page.
 */
export function usePlatformMe({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["platform-me"],
    queryFn: getPlatformMe,
    enabled,
    retry: false,
  });
}
