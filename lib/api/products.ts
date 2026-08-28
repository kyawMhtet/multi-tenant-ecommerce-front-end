import { apiFetch } from "@/lib/api-client";
import type {
  AddVariantPayload,
  ApiResource,
  PaginatedResponse,
  Product,
  ProductVariant,
  RestockPayload,
  StoreProductPayload,
  UpdateProductPayload,
  UpdateVariantPayload,
} from "@/lib/types";

export interface ProductsPageParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  is_active?: "true" | "false";
  // Only "true" is meaningful — matches IndexProductRequest's rule on the
  // Laravel side, which checks this with !empty(), not array_key_exists()
  // like is_active. Sending "false" is a no-op identical to omitting it, so
  // there's no reason to ever send it — omit the key instead.
  low_stock?: "true";
}

// Matches IndexProductRequest::rules() / ProductService::listProducts() —
// verified directly against the Laravel source. page and per_page (1-100,
// validated) are both genuinely honored server-side now.
export function getProductsPage(
  params: ProductsPageParams = {},
): Promise<PaginatedResponse<Product>> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.search) query.set("search", params.search);
  if (params.category_id !== undefined) query.set("category_id", String(params.category_id));
  if (params.is_active) query.set("is_active", params.is_active);
  if (params.low_stock) query.set("low_stock", params.low_stock);
  const qs = query.toString();

  return apiFetch<PaginatedResponse<Product>>(`/api/v1/products${qs ? `?${qs}` : ""}`);
}

export function getProducts(): Promise<Product[]> {
  return getProductsPage().then((res) => res.data);
}

export function getProduct(id: number | string): Promise<Product> {
  return apiFetch<ApiResource<Product>>(`/api/v1/products/${id}`).then((res) => res.data);
}

export function createProduct(payload: StoreProductPayload): Promise<Product> {
  // multipart/form-data, not JSON — images are real files. apiFetch only
  // sets Content-Type: application/json when the body isn't a FormData
  // instance, so passing FormData here correctly lets the browser set the
  // multipart boundary itself.
  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("description", payload.description ?? "");
  // Omitted (not sent as empty) when null — category_id is nullable on
  // StoreProductRequest, so "no category" just means not sending the field.
  if (payload.category_id !== null) {
    formData.append("category_id", String(payload.category_id));
  }
  formData.append("variant[sku]", payload.variant.sku);
  formData.append("variant[buying_price]", String(payload.variant.buying_price));
  formData.append("variant[selling_price]", String(payload.variant.selling_price));
  formData.append("variant[unit]", payload.variant.unit);
  formData.append("variant[current_stock]", String(payload.variant.current_stock));
  payload.images?.forEach((file) => formData.append("images[]", file));

  return apiFetch<ApiResource<Product>>("/api/v1/products", {
    method: "POST",
    body: formData,
  }).then((res) => res.data);
}

export function updateProduct(
  id: number | string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const formData = new FormData();
  // Method-spoofed PUT: a fetch() body can't reliably carry multipart data
  // on a real PUT/PATCH request across environments, so this POSTs with
  // _method=PUT instead — Laravel's standard workaround, and the exact
  // pattern tests/Feature/Products/ProductImageUploadTest.php uses against
  // this same route.
  formData.append("_method", "PUT");
  if (payload.name !== undefined) formData.append("name", payload.name);
  if (payload.description !== undefined) {
    formData.append("description", payload.description ?? "");
  }
  // Only ever a real id, never sent to clear — see the comment on
  // UpdateProductPayload.category_id in lib/types.ts for why.
  if (payload.category_id !== undefined) {
    formData.append("category_id", String(payload.category_id));
  }
  // Laravel's `boolean` rule over multipart wants "1"/"0", not a JS bool
  // stringified to "true"/"false". Omitted entirely when the caller isn't
  // touching visibility, keeping this a genuine partial update.
  if (payload.is_active !== undefined) {
    formData.append("is_active", payload.is_active ? "1" : "0");
  }
  // New uploads and removals are processed in this same request, inside one
  // transaction — the backend guarantees it's all-or-nothing (an id from a
  // different product 422s the whole save), so there's no separate delete
  // call and nothing partial to reconcile if this fails.
  payload.images?.forEach((file) => formData.append("images[]", file));
  payload.remove_image_ids?.forEach((imageId) =>
    formData.append("remove_image_ids[]", String(imageId)),
  );

  return apiFetch<ApiResource<Product>>(`/api/v1/products/${id}`, {
    method: "POST",
    body: formData,
  }).then((res) => res.data);
}

// Not called from any page yet — Route::apiResource('products', ...)
// includes destroy, but no admin screen has a delete action today. Included
// so the API layer is ready the moment one is added.
export function deleteProduct(id: number | string): Promise<void> {
  return apiFetch<void>(`/api/v1/products/${id}`, { method: "DELETE" });
}

// multipart/form-data, same reasoning as createProduct — the endpoint now
// accepts optional per-variant images[]. Verified against
// ProductVariantController::store(): 201 with the created variant, 422 on a
// duplicate sku within the tenant, 404 if the product belongs to another
// tenant. Numbers go over the wire as strings; Laravel's numeric rules and
// the model's decimal casts accept them, exactly as for createProduct.
export function addVariant(
  productId: number | string,
  payload: AddVariantPayload,
): Promise<ProductVariant> {
  const formData = new FormData();
  formData.append("sku", payload.sku);
  if (payload.variant_name !== undefined) formData.append("variant_name", payload.variant_name);
  if (payload.unit !== undefined) formData.append("unit", payload.unit);
  formData.append("buying_price", String(payload.buying_price));
  formData.append("selling_price", String(payload.selling_price));
  if (payload.current_stock !== undefined) {
    formData.append("current_stock", String(payload.current_stock));
  }
  payload.images?.forEach((file) => formData.append("images[]", file));

  return apiFetch<ApiResource<ProductVariant>>(`/api/v1/products/${productId}/variants`, {
    method: "POST",
    body: formData,
  }).then((res) => res.data);
}

// Method-spoofed PATCH over multipart — same pattern as updateProduct, now
// that the endpoint carries variant image uploads. New images append and
// removals drop, processed together in one request; the backend guarantees
// it's all-or-nothing (a remove_image_id belonging to a different variant
// 422s the whole save), so there's nothing partial to reconcile here.
export function updateVariant(
  productId: number | string,
  variantId: number,
  payload: UpdateVariantPayload,
): Promise<ProductVariant> {
  const formData = new FormData();
  formData.append("_method", "PATCH");
  if (payload.sku !== undefined) formData.append("sku", payload.sku);
  // "" clears the field over multipart (ConvertEmptyStringsToNull → null),
  // the only way to send a null on this transport — same as updateProduct's
  // description.
  if (payload.barcode !== undefined) formData.append("barcode", payload.barcode ?? "");
  if (payload.variant_name !== undefined) {
    formData.append("variant_name", payload.variant_name ?? "");
  }
  if (payload.unit !== undefined) formData.append("unit", payload.unit);
  if (payload.buying_price !== undefined) {
    formData.append("buying_price", String(payload.buying_price));
  }
  if (payload.selling_price !== undefined) {
    formData.append("selling_price", String(payload.selling_price));
  }
  if (payload.low_stock_threshold !== undefined) {
    formData.append(
      "low_stock_threshold",
      payload.low_stock_threshold === null ? "" : String(payload.low_stock_threshold),
    );
  }
  // Laravel's `boolean` rule over multipart wants "1"/"0".
  if (payload.track_stock !== undefined) {
    formData.append("track_stock", payload.track_stock ? "1" : "0");
  }
  if (payload.is_active !== undefined) {
    formData.append("is_active", payload.is_active ? "1" : "0");
  }
  payload.images?.forEach((file) => formData.append("images[]", file));
  payload.remove_image_ids?.forEach((imageId) =>
    formData.append("remove_image_ids[]", String(imageId)),
  );

  return apiFetch<ApiResource<ProductVariant>>(
    `/api/v1/products/${productId}/variants/${variantId}`,
    {
      method: "POST",
      body: formData,
    },
  ).then((res) => res.data);
}

// Verified against ProductVariantController::restock() /
// StoreRestockRequest — 422 if the variant has track_stock: false (see
// RestockPayload in lib/types.ts). Returns the updated variant, reflecting
// the new current_stock and, if unit_cost was sent, the new buying_price.
export function restockVariant(
  productId: number | string,
  variantId: number,
  payload: RestockPayload,
): Promise<ProductVariant> {
  return apiFetch<ApiResource<ProductVariant>>(
    `/api/v1/products/${productId}/variants/${variantId}/restock`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  ).then((res) => res.data);
}
