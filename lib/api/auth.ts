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

// Self-serve signup: creates the tenant and its owner in one call and
// returns a token, so the caller stores it and treats the user as logged in
// straight away. Rate limited to 5/min per IP server-side — that comes back
// as a 429, which has no per-field `errors` payload, unlike the 422s the
// signup form maps onto its fields.
export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/api/v1/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
