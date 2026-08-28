const TOKEN_STORAGE_KEY = "admin_auth_token";
const TENANT_SLUG_STORAGE_KEY = "admin_tenant_slug";
const USER_NAME_STORAGE_KEY = "admin_user_name";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// The logged-in admin's own tenant slug (from AuthUser.tenant_slug at
// login) — not used for X-Tenant-Slug (ResolveTenant derives that from the
// authenticated user server-side and ignores the header entirely), only
// for building this tenant's storefront links client-side, e.g. the Copy
// Link button on the product edit screen.
export function getStoredTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TENANT_SLUG_STORAGE_KEY);
}

export function setStoredTenantSlug(slug: string): void {
  window.localStorage.setItem(TENANT_SLUG_STORAGE_KEY, slug);
}

export function clearStoredTenantSlug(): void {
  window.localStorage.removeItem(TENANT_SLUG_STORAGE_KEY);
}

// The logged-in admin's own name (from AuthUser.name at login) — same
// reasoning as tenant slug above: nothing else survives a page refresh,
// and the sidebar's user menu needs a name to show without re-hitting the
// API on every load just for display.
export function getStoredUserName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_NAME_STORAGE_KEY);
}

export function setStoredUserName(name: string): void {
  window.localStorage.setItem(USER_NAME_STORAGE_KEY, name);
}

export function clearStoredUserName(): void {
  window.localStorage.removeItem(USER_NAME_STORAGE_KEY);
}
