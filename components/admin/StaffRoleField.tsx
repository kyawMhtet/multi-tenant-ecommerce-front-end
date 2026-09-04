"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { controls, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ShopRole, StaffRoleOption } from "@/lib/types";

const ROLE_HINTS: Record<ShopRole, string> = {
  cashier: "Sells in the POS and works orders. Can't change products, prices or couriers.",
  manager: "Everything a cashier can do, plus products, restocks, couriers, refunds and reports.",
  owner: "Full access, including billing, the shop profile and these staff accounts.",
};

interface StaffRoleFieldProps {
  roles: StaffRoleOption[];
  value: ShopRole;
  onChange: (role: ShopRole) => void;
  disabled?: boolean;
  disabledHint?: string;
  error?: string;
}

export function StaffRoleField({
  roles,
  value,
  onChange,
  disabled = false,
  disabledHint,
  error,
}: StaffRoleFieldProps) {
  const items: Record<string, string> = {};
  roles.forEach((role) => {
    items[role.value] = role.label;
  });

  return (
    <Label className="flex flex-col items-stretch gap-2">
      <span className="text-sm font-medium">Role</span>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => onChange(next as ShopRole)}
        disabled={disabled}
      >
        <SelectTrigger className={cn(controls.select, "w-full")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <span className="text-sm text-destructive">{error}</span>
      ) : (
        <span className={typography.muted}>
          {disabled && disabledHint ? disabledHint : ROLE_HINTS[value]}
        </span>
      )}
    </Label>
  );
}
