import { getStoredToken } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  // Full parsed JSON body. `errors` only covers Laravel's validation-error
  // shape (Record<string, string[]>) — business exceptions (e.g. a stock
  // check failing) return their own custom fields, so callers that need
  // those read them off `body` instead.
  body: unknown;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
    body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();
  if (token) {
    // Authenticated (admin) requests deliberately don't send
    // X-Tenant-Slug at all. Laravel's ResolveTenant derives the tenant
    // from the authenticated user directly for any authenticated request
    // and never reads this header on that path — so sending one here
    // would just be dead weight, not a missing requirement.
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    // Unauthenticated request (login, storefront) — attach X-Tenant-Slug
    // only when the current host is actually a tenant subdomain. Neither
    // /api/v1/login nor /api/v1/public/products/{slug} currently reads
    // this header (see routes/api.php — the public product route
    // resolves its tenant from the variant slug alone), so this is
    // forward-compatible rather than load-bearing today.
    const tenantSlug =
      typeof window !== "undefined" ? resolveTenantSlug(window.location.host) : null;
    if (tenantSlug) {
      headers.set("X-Tenant-Slug", tenantSlug);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? response.statusText,
      response.status,
      body?.errors,
      body,
    );
  }

  return body as T;
}
