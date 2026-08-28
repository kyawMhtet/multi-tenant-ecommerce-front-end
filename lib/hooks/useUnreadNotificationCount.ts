"use client";

import { useQuery } from "@tanstack/react-query";
import { getUnreadNotificationCount } from "@/lib/api/notifications";

// No WebSocket infra yet — polling is the intended cadence, not a stopgap.
const POLL_INTERVAL_MS = 20_000;

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: POLL_INTERVAL_MS,
  });
}
