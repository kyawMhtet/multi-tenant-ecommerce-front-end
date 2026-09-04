import { apiFetch } from "@/lib/api-client";
import type { ApiResource, AuthUser } from "@/lib/types";

export function getMe(): Promise<AuthUser> {
  return apiFetch<ApiResource<AuthUser>>("/api/v1/me").then((res) => res.data);
}
