"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { suspendShop } from "@/lib/api/platform-shops";

/**
 * Lock a shop's OWNER out of their admin. The storefront keeps serving.
 *
 * Invalidates the ["platform-shops"] prefix rather than patching the row: the
 * response is the updated shop, but the same shop appears on the directory and
 * on its own detail screen, and letting those disagree about whether a shop is
 * suspended is exactly the kind of thing someone would act on.
 */
export function useSuspendShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => suspendShop(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-shops"] });
    },
  });
}
