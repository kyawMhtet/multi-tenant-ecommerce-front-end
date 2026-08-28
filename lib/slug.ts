// Client-side mirror of the backend's `slug` validation on POST
// /api/v1/register. The slug becomes the shop's storefront subdomain, so
// these are DNS-label rules as much as validation rules.
//
// Everything here is a UX shortcut: the server's own validation is what
// actually decides, and its 422 is mapped back onto the field. That
// asymmetry is deliberate — a rule that's too loose here just costs one
// round-trip, while a rule that's too strict silently blocks a signup the
// backend would have accepted. So the reserved list below only ever mirrors
// words the backend has confirmed; nothing is added to it on a hunch.

export const SLUG_MAX_LENGTH = 63;

// The backend's reserved list, mirrored verbatim (43 words, confirmed
// 2026-08-26). Grouped as the backend groups them so a future diff against
// it stays readable.
//
// Drift is safe in one direction only, which is why this stays hardcoded:
// a word ADDED server-side and missing here just costs one round-trip, and
// the 422 says the right thing. A word REMOVED server-side would leave us
// falsely blocking a slug the API now accepts — so if the backend ever
// shortens this list, it needs to be mirrored here promptly.
//
// Matching is exact against the whole slug, never a substring — 'admin-shop'
// and 'my-cart' are both fine, only the bare word is blocked. It's exact
// rather than case-insensitive here because validateSlug rejects anything
// non-lowercase before this lookup is reached.
export const RESERVED_SLUGS = new Set([
  // Storefront paths.
  "cart", "checkout", "login", "logout", "register", "signup", "account",
  "orders", "wishlist", "search", "about", "contact", "help", "faq", "terms",
  "privacy", "shipping", "returns",
  // Admin and API paths.
  "admin", "api", "dashboard", "settings", "pos", "products", "categories",
  "customers", "reports", "auth",
  // Static/asset paths.
  "static", "assets", "public", "storage", "favicon", "robots", "sitemap",
  // Infrastructure hostnames — these matter because the slug is a real
  // subdomain. 'www' and 'admin' are also the two that lib/tenant.ts's
  // resolveTenantSlug routes to the admin app, so a tenant holding either
  // would have an unreachable storefront no matter what the API allowed.
  "www", "mail", "ftp", "smtp", "ns1", "ns2", "cdn", "status",
]);

/**
 * Best-effort slug suggestion from a shop name, used to prefill the field
 * until the owner edits it themselves. Returns "" for input with no
 * ASCII-alphanumeric characters at all (e.g. a shop name written entirely
 * in Burmese) — the field is required, so the owner just types their own.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    // Strip combining marks left behind by NFKD so accented Latin letters
    // fold to their base letter instead of becoming hyphens.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    // The slice can leave a trailing hyphen behind on a long name.
    .replace(/-+$/g, "");
}

/** Returns a user-facing error message, or null when the slug looks valid. */
export function validateSlug(slug: string): string | null {
  if (!slug) return "Shop address is required.";
  if (slug.length > SLUG_MAX_LENGTH) {
    return `Shop address must be ${SLUG_MAX_LENGTH} characters or fewer.`;
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return "Use lowercase letters, numbers and hyphens only.";
  }
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return "Shop address can't start or end with a hyphen.";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return "That shop address is reserved. Please pick another.";
  }
  return null;
}
