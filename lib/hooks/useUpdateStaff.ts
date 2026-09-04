"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStaff } from "@/lib/api/staff";
import type { UpdateStaffPayload } from "@/lib/types";

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateStaffPayload }) =>
      updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
