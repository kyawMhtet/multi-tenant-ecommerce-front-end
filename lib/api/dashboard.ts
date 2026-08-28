import { apiFetch } from "@/lib/api-client";
import type { ApiResource, DashboardSummary } from "@/lib/types";

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<ApiResource<DashboardSummary>>("/api/v1/dashboard/summary").then(
    (res) => res.data,
  );
}
