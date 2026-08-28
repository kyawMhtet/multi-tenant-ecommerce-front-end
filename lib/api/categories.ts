import { apiFetch } from "@/lib/api-client";
import type { ApiResource, Category } from "@/lib/types";

export function getCategories(): Promise<Category[]> {
  return apiFetch<ApiResource<Category[]>>("/api/v1/categories").then((res) => res.data);
}
