"use client";

import { useTenant } from "@/lib/hooks/useTenant";
import { parseAccessError } from "@/lib/access-error";
import { AccessNotice } from "@/components/shared/AccessNotice";

export function ShopSuspendedNotice() {
  const { error } = useTenant();
  const refusal = parseAccessError(error);

  if (refusal?.reason !== "shop_suspended") return null;

  return (
    <AccessNotice
      refusal={refusal}
      className="items-start rounded-none border-x-0 border-t-0 px-4 sm:px-8 print:hidden"
    />
  );
}
