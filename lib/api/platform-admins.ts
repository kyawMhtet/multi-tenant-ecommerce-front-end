import { platformApiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  CreatePlatformAdminPayload,
  PaginatedResponse,
  PlatformStaffAccount,
} from "@/lib/types";

// Platform staff accounts — the people who can read and settle money across
// every shop on the platform.
//
// Worth being clear-eyed about what this screen changes: minting one of these
// used to require SHELL access (`php artisan platform:create-admin`) and now
// requires a session. The command still exists as the way the first account
// exists and the way back from a total lockout, but the bar is genuinely
// lower, which is why the password minimum here is 12 rather than the shop
// side's 8.

// Paginated server-side at a fixed 25 — the controller takes no per_page, so
// there's no page-size selector to offer.
export function getPlatformAdmins(page = 1): Promise<PaginatedResponse<PlatformStaffAccount>> {
  return platformApiFetch<PaginatedResponse<PlatformStaffAccount>>(
    `/api/v1/platform/admins?page=${page}`,
  );
}

// 201. `email` has its own unique index, independent of users.email — the same
// person may legitimately be both platform staff and the owner of a shop on
// the platform — so a duplicate here is a 422 on this table only.
export function createPlatformAdmin(
  payload: CreatePlatformAdminPayload,
): Promise<PlatformStaffAccount> {
  return platformApiFetch<ApiResource<PlatformStaffAccount>>("/api/v1/platform/admins", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

/**
 * Revoke an admin's access. NOT deletion.
 *
 * It takes effect on the deactivated admin's very next request —
 * EnsurePlatformAdmin re-checks is_active every time — and their tokens are
 * deliberately kept, so reactivating restores the account without a fresh
 * sign-in. Rows are never deleted because subscription_invoices.reviewed_by
 * points here: dropping one would erase who confirmed a payment.
 *
 * An admin cannot deactivate THEMSELVES: the API answers 422 with reason
 * "billing_action_unavailable", which parseBillingError() renders as a plain
 * message rather than an upgrade prompt (nothing here is fixed by paying).
 * That server check is the real guard; the disabled button on your own row is
 * only courtesy.
 */
export function deactivatePlatformAdmin(id: number): Promise<PlatformStaffAccount> {
  return platformApiFetch<ApiResource<PlatformStaffAccount>>(
    `/api/v1/platform/admins/${id}/deactivate`,
    { method: "POST" },
  ).then((res) => res.data);
}

export function reactivatePlatformAdmin(id: number): Promise<PlatformStaffAccount> {
  return platformApiFetch<ApiResource<PlatformStaffAccount>>(
    `/api/v1/platform/admins/${id}/reactivate`,
    { method: "POST" },
  ).then((res) => res.data);
}
