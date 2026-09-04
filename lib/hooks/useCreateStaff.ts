"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStaff } from "@/lib/api/staff";
import type { StoreStaffPayload } from "@/lib/types";

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StoreStaffPayload) => createStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
