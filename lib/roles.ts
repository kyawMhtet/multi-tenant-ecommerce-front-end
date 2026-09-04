import { SHOP_ROLES, type ShopRole } from "@/lib/types";

const ROLE_LABELS: Record<ShopRole, string> = {
  cashier: "Cashier",
  manager: "Manager",
  owner: "Owner",
};

export function isShopRole(value: unknown): value is ShopRole {
  return typeof value === "string" && SHOP_ROLES.includes(value as ShopRole);
}

export function roleRank(role: string | null | undefined): number {
  return isShopRole(role) ? SHOP_ROLES.indexOf(role) : -1;
}

export function roleAtLeast(
  role: string | null | undefined,
  minimum: ShopRole,
): boolean {
  return roleRank(role) >= roleRank(minimum);
}

export function roleLabel(role: string | null | undefined): string {
  return isShopRole(role) ? ROLE_LABELS[role] : "Staff";
}
