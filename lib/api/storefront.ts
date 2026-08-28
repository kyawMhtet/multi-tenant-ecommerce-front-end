import { apiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  Category,
  PaginatedResponse,
  PublicShop,
  StorefrontListProduct,
  StorefrontProduct,
} from "@/lib/types";

export function getPublicProduct(slug: string): Promise<StorefrontProduct> {
  return apiFetch<ApiResource<StorefrontProduct>>(`/api/v1/public/products/${slug}`).then(
    (res) => res.data,
  );
}

// Unauthenticated, and the one storefront call that genuinely depends on
// X-Tenant-Slug: there's no product slug in the URL to resolve the tenant
// from, so api-client's host-derived header is what scopes it. That makes
// it callable only from a tenant subdomain — the product page reads the
// same payload off `shop` instead of calling this.
export function getPublicShop(): Promise<PublicShop> {
  return apiFetch<ApiResource<PublicShop>>("/api/v1/public/shop").then((res) => res.data);
}

// The wire-shaped params for the catalog grid. search matches product name
// only (SKU is staff-internal and deliberately not exposed here);
// category_id comes straight from getPublicCategories. The user-controlled
// subset (search/category_id) is PublicProductsFilters in
// lib/hooks/usePublicProducts.ts, which drives the query key.
export interface PublicProductsParams {
  search?: string;
  category_id?: number;
  page?: number;
  // Server default is 12, hard-capped at 50 (422 above that).
  // usePublicProducts sends a fixed value.
  per_page?: number;
}

// GET /api/v1/public/products — the shop's catalog grid. Same tenant-by-
// subdomain scoping as getPublicShop, and load-bearing the same way (no slug
// in the URL for the backend to derive the tenant from). Returns a standard
// paginated collection; each item is a StorefrontProduct without the
// embedded `shop` (the home page already fetched it once via getPublicShop).
// Only active products with at least one active variant come back — nothing
// to filter client-side.
export function getPublicProducts(
  params: PublicProductsParams = {},
): Promise<PaginatedResponse<StorefrontListProduct>> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category_id !== undefined) query.set("category_id", String(params.category_id));
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  const qs = query.toString();

  return apiFetch<PaginatedResponse<StorefrontListProduct>>(
    `/api/v1/public/products${qs ? `?${qs}` : ""}`,
  );
}

// GET /api/v1/public/categories — the storefront counterpart of
// getCategories (which hits the authenticated admin route). Unpaginated: a
// shop's categories are few and admin-curated. Feed an id straight into
// getPublicProducts's category_id.
export function getPublicCategories(): Promise<Category[]> {
  return apiFetch<ApiResource<Category[]>>("/api/v1/public/categories").then((res) => res.data);
}
