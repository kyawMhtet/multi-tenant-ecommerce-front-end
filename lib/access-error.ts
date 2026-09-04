import { ApiError } from "@/lib/api-client";
import { isShopRole, roleLabel } from "@/lib/roles";
import type { ShopRole } from "@/lib/types";

export type AccessRefusal =
  | {
      reason: "insufficient_role";
      message: string;
      requiredRole: ShopRole | null;
    }
  | { reason: "shop_suspended"; message: string; detail: string | null };

export function parseAccessError(error: unknown): AccessRefusal | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status !== 403) return null;

  const body =
    error.body && typeof error.body === "object"
      ? (error.body as Record<string, unknown>)
      : {};
  const reason = body.reason;

  if (reason === "insufficient_role") {
    const required = body.required_role;
    return {
      reason,
      message: error.message,
      requiredRole: isShopRole(required) ? required : null,
    };
  }

  if (reason === "shop_suspended") {
    return {
      reason,
      message: error.message,
      detail: typeof body.detail === "string" ? body.detail : null,
    };
  }

  return null;
}

export function accessRefusalTitle(refusal: AccessRefusal): string {
  if (refusal.reason === "shop_suspended") return "This shop is suspended";
  return refusal.requiredRole
    ? `This needs the ${roleLabel(refusal.requiredRole)} role`
    : "You don't have permission for this";
}

export function roleRequiredMessage(minimum: ShopRole): string {
  return `This part of the admin is for ${roleLabel(minimum).toLowerCase()}s and above. Ask the shop owner if you need access.`;
}
