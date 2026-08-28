"use client";

import { useMutation } from "@tanstack/react-query";
import { register } from "@/lib/api/auth";

// No query invalidation here, unlike the other mutation hooks: signup runs
// on a public page with nothing cached yet — the brand-new tenant's data is
// fetched fresh by the dashboard after the redirect.
export function useRegister() {
  return useMutation({
    mutationFn: register,
  });
}
