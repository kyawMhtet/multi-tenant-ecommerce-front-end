"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteStaff } from "@/lib/api/staff";

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
