"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead } from "@/lib/api/notifications";

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
