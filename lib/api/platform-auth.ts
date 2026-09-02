import { platformApiFetch } from "@/lib/api-client";
import type { ApiResource, PlatformAdmin, PlatformLoginResponse } from "@/lib/types";

// PLATFORM staff sign-in — our own people, not a shop's.
//
// Every function here goes through platformApiFetch, never apiFetch: the two
// tokens live under different storage keys and are refused at each other's
// doors server-side (a shop token 403s on /platform/*, and a platform token
// 403s on every tenant route). Using the wrong wrapper wouldn't fail loudly
// at the call site — it would send a shop owner's token to a platform
// endpoint, or worse, overwrite their session. See lib/platform-auth.ts.

export interface PlatformLoginPayload {
  email: string;
  password: string;
}

// Note the envelope: unlike the shop's LoginResponse, where the token sits
// alongside `data`, here it's INSIDE it next to the admin. Rate limited
// server-side ('throttle:platform-login'), which arrives as a 429 with no
// per-field `errors` payload.
export function platformLogin(
  payload: PlatformLoginPayload,
): Promise<PlatformLoginResponse["data"]> {
  return platformApiFetch<PlatformLoginResponse>("/api/v1/platform/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

// The only way to tell whether a stored platform token is still good. Used by
// the (platform) layout as its auth check, rather than trusting that a token
// in localStorage means a live session.
export function getPlatformMe(): Promise<PlatformAdmin> {
  return platformApiFetch<ApiResource<PlatformAdmin>>("/api/v1/platform/me").then(
    (res) => res.data,
  );
}

// Revokes the token server-side. The caller clears local storage regardless of
// whether this succeeds — a token we've thrown away is useless to us either
// way, and failing to sign out locally because the network blipped is the
// worse outcome.
export function platformLogout(): Promise<void> {
  return platformApiFetch<void>("/api/v1/platform/logout", { method: "POST" });
}
