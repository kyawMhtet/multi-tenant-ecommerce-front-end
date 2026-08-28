"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/lib/api/notifications";

// enabled so the list is only fetched once the bell dropdown is actually
// open — the count keeps polling in the background regardless (see
// useUnreadNotificationCount), this just avoids also paying for the list
// endpoint on every poll tick.
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => getNotifications({ per_page: 15, unread_only: true }),
    enabled,
  });
}
