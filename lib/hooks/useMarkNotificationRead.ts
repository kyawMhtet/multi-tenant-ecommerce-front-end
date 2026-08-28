"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationRead } from "@/lib/api/notifications";

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
