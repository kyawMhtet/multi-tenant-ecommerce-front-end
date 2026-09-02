import { apiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  DeliveryProvider,
  StoreDeliveryProviderPayload,
  UpdateDeliveryProviderPayload,
} from "@/lib/types";

// The shop's own courier list — who it hands parcels to. Plain JSON, not
// multipart: nothing here carries a file, unlike the tenant and product
// endpoints.

export function getDeliveryProviders(): Promise<DeliveryProvider[]> {
  return apiFetch<ApiResource<DeliveryProvider[]>>("/api/v1/delivery-providers").then(
    (res) => res.data,
  );
}

// Names are unique per shop — a duplicate comes back as a 422 on `name`,
// which the form surfaces on the field rather than as a banner.
export function createDeliveryProvider(
  payload: StoreDeliveryProviderPayload,
): Promise<DeliveryProvider> {
  return apiFetch<ApiResource<DeliveryProvider>>("/api/v1/delivery-providers", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateDeliveryProvider(
  id: number,
  payload: UpdateDeliveryProviderPayload,
): Promise<DeliveryProvider> {
  return apiFetch<ApiResource<DeliveryProvider>>(`/api/v1/delivery-providers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

// Safe to call: orders dispatched with this courier keep its name, because
// they snapshot delivery_provider_name rather than joining on the id.
export function deleteDeliveryProvider(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/delivery-providers/${id}`, { method: "DELETE" });
}
