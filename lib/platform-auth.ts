// PLATFORM staff credentials — our own people reviewing bank transfers, not
// shop owners.
//
// Deliberately a separate module from lib/auth.ts with its own keys, because
// the two identities are separate tables server-side and their tokens are NOT
// interchangeable: a shop token gets a 403 on /api/v1/platform/*, and a
// platform token gets a 403 on every tenant route (routes/api.php guards both
// doors by identity TYPE, since Sanctum tokens are polymorphic and
// auth:sanctum alone would let either through either door).
//
// Writing a platform token into lib/auth.ts's "admin_auth_token" would
// therefore do something worse than not working: it would silently sign a
// shop owner out of their own session on this browser, and then attach a
// platform token to every shop request until they noticed. Hence a different
// key, read by a different fetch wrapper (platformApiFetch).
const TOKEN_STORAGE_KEY = "platform_auth_token";
const ADMIN_NAME_STORAGE_KEY = "platform_admin_name";

export function getStoredPlatformToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredPlatformToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredPlatformToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// Same reasoning as getStoredUserName in lib/auth.ts: the platform header
// wants a name on first paint, and nothing else survives a refresh.
export function getStoredPlatformAdminName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_NAME_STORAGE_KEY);
}

export function setStoredPlatformAdminName(name: string): void {
  window.localStorage.setItem(ADMIN_NAME_STORAGE_KEY, name);
}

export function clearStoredPlatformAdminName(): void {
  window.localStorage.removeItem(ADMIN_NAME_STORAGE_KEY);
}
