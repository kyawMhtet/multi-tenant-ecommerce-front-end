import { apiFetch } from "@/lib/api-client";
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
} from "@/lib/types";

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Self-serve signup: creates the tenant and its owner in one call, and
// returns NO token. Registering is not authenticating — the caller sends the
// owner to /login to enter the password they just chose, which keeps token
// issuance in one place (login) and leaves the seam where email verification
// would go. Storing anything from this response as a session is the bug this
// comment exists to prevent.
//
// Rate limited to 5/min per IP server-side — that comes back as a 429, which
// has no per-field `errors` payload, unlike the 422s the signup form maps
// onto its fields.
export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/api/v1/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
