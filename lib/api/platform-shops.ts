import { platformApiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  PaginatedResponse,
  PlatformShop,
  PlatformShopsPageParams,
} from "@/lib/types";

// The shop directory — OUR staff looking across every tenant.
//
// platformApiFetch, never apiFetch. The two tokens live under different
// storage keys and are refused at each other's doors server-side, so using the
// wrong wrapper here wouldn't fail at the call site — it would send a shop
// owner's token to a cross-tenant endpoint. See lib/platform-auth.ts.

/**
 * Shops, newest first, 25 to a page.
 *
 * Every filter is validated against a catalogue server-side, so an invalid
 * value comes back as a 422 rather than an empty page. That's deliberate — an
 * empty list would read as "no such shops" — which is why the UI drives these
 * from fixed option lists and why nothing here coerces or silently drops a
 * value it doesn't recognise.
 */
export function getPlatformShops(
  params: PlatformShopsPageParams = {},
): Promise<PaginatedResponse<PlatformShop>> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.search) query.set("search", params.search);
  if (params.plan) query.set("plan", params.plan);
  if (params.status) query.set("status", params.status);
  if (params.rail) query.set("rail", params.rail);
  if (params.currency) query.set("currency", params.currency);
  // Both booleans are meaningful, unlike the products list's low_stock: false
  // filters for shops that are NOT suspended, which is a real question. So
  // this checks for undefined rather than falsiness.
  if (params.suspended !== undefined) query.set("suspended", params.suspended ? "1" : "0");
  const qs = query.toString();

  return platformApiFetch<PaginatedResponse<PlatformShop>>(
    `/api/v1/platform/shops${qs ? `?${qs}` : ""}`,
  );
}

/**
 * One shop in full: the directory row plus products_count, orders_count and
 * its latest 20 invoices.
 *
 * The counts are the fastest read on a real business versus an abandoned
 * signup, which is the first thing worth knowing when a shop turns up in the
 * support queue. This is also the only place a subscription id is ever
 * published, which is what makes the billing-currency endpoint reachable.
 */
export function getPlatformShop(id: number | string): Promise<PlatformShop> {
  return platformApiFetch<ApiResource<PlatformShop>>(`/api/v1/platform/shops/${id}`).then(
    (res) => res.data,
  );
}

/**
 * Lock the OWNER out of their admin.
 *
 * This does NOT take the storefront down: customers keep browsing and can
 * still complete checkout. That asymmetry is the entire reason suspension
 * exists apart from the `is_active` kill switch, which is deliberately not
 * exposed by this app at all.
 *
 * The reason is REQUIRED (5–500 server-side) and the owner reads it — a
 * suspended shop's owner gets a 403 with reason "shop_suspended" and this text
 * as `detail`. Re-suspending an already-suspended shop updates the reason
 * rather than failing, and keeps the original timestamp, so correcting a note
 * is a normal thing to do.
 */
export function suspendShop(id: number, reason: string): Promise<PlatformShop> {
  return platformApiFetch<ApiResource<PlatformShop>>(`/api/v1/platform/shops/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }).then((res) => res.data);
}

// Clears the suspension and the reason together — leaving the reason behind
// would have the shop's record permanently asserting something untrue.
export function restoreShop(id: number): Promise<PlatformShop> {
  return platformApiFetch<ApiResource<PlatformShop>>(`/api/v1/platform/shops/${id}/restore`, {
    method: "POST",
  }).then((res) => res.data);
}
