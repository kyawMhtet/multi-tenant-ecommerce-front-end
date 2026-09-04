import { Lock } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { roleRequiredMessage } from "@/lib/access-error";
import type { ShopRole } from "@/lib/types";

export function RoleRequiredNotice({
  minimum,
  variant = "panel",
}: {
  minimum: ShopRole;
  variant?: "panel" | "inline";
}) {
  return (
    <EmptyState
      variant={variant}
      icon={Lock}
      title="You don't have access to this"
      description={roleRequiredMessage(minimum)}
    />
  );
}
