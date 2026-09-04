"use client";

import { useMe } from "@/lib/hooks/useMe";
import { roleAtLeast } from "@/lib/roles";
import type { ShopRole } from "@/lib/types";

export function useRole() {
  const { data, isPending, isError } = useMe();
  const role = data?.role ?? null;

  return {
    role,
    isPending,
    isError,
    isOwner: roleAtLeast(role, "owner"),
    canManage: roleAtLeast(role, "manager"),
    can: (minimum: ShopRole) => roleAtLeast(role, minimum),
  };
}
