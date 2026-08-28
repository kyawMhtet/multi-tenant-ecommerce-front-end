import { apiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  OnlineOrderPaymentAction,
  OnlineOrderResult,
  Order,
  OrderFilterParams,
  PaginatedResponse,
  StoreOnlineOrderPayload,
  StoreOrderPayload,
  UpdateOrderPayload,
} from "@/lib/types";

export function createOrder(payload: StoreOrderPayload): Promise<Order> {
  return apiFetch<ApiResource<Order>>("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export interface OrdersPageParams extends OrderFilterParams {
  page?: number;
  per_page?: number;
}

// Matches IndexOrderRequest::rules() / OrderService::listOrders() —
// verified directly against the Laravel source.
export function getOrdersPage(
  params: OrdersPageParams = {},
): Promise<PaginatedResponse<Order>> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.status) query.set("status", params.status);
  if (params.source) query.set("source", params.source);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  if (params.per_page) query.set("per_page", String(params.per_page));
  const qs = query.toString();

  return apiFetch<PaginatedResponse<Order>>(`/api/v1/orders${qs ? `?${qs}` : ""}`);
}

export function getOrder(id: number | string): Promise<Order> {
  return apiFetch<ApiResource<Order>>(`/api/v1/orders/${id}`).then((res) => res.data);
}

// Unlike every other create in this app, the response isn't a plain
// ApiResource: a `payment` object sits beside `data` telling the caller what
// has to happen next (send the browser to a hosted checkout, or nothing at
// all). Both are returned, so the checkout doesn't have to re-derive that
// from the payment method it happened to send.
//
// Encoding switches on whether a screenshot is attached. JSON stays the
// common path — a multipart body forces every scalar through Laravel's
// string coercion, and items[][] nesting is far easier to get wrong — so
// FormData is used only when there's genuinely a file to carry.
export function createOnlineOrder(payload: StoreOnlineOrderPayload): Promise<OnlineOrderResult> {
  const { payment_proof: proof, ...rest } = payload;

  // Pickup discards any address server-side, so it's dropped here rather
  // than sent and ignored — and blank optional keys are stripped so an
  // untouched "Township" field doesn't land as an empty string on the order.
  const address =
    rest.fulfillment_type === "delivery" && rest.delivery_address
      ? (Object.fromEntries(
          Object.entries(rest.delivery_address).filter(([, v]) => v && v.trim() !== ""),
        ) as Record<string, string>)
      : null;

  const request: RequestInit = { method: "POST" };
  if (proof) {
    const formData = new FormData();
    rest.items.forEach((item, i) => {
      formData.append(`items[${i}][product_variant_slug]`, item.product_variant_slug);
      formData.append(`items[${i}][quantity]`, String(item.quantity));
    });
    formData.append("customer_name", rest.customer_name);
    formData.append("customer_phone", rest.customer_phone);
    formData.append("payment_method", rest.payment_method);
    formData.append("fulfillment_type", rest.fulfillment_type);
    // Bracket notation is how Laravel reads a nested object out of
    // multipart; there's no way to express a null here, so pickup simply
    // omits the whole group.
    if (address) {
      Object.entries(address).forEach(([key, value]) => {
        formData.append(`delivery_address[${key}]`, value);
      });
    }
    formData.append("payment_proof", proof);
    request.body = formData;
  } else {
    request.body = JSON.stringify({
      ...rest,
      fulfillment_type: rest.fulfillment_type,
      delivery_address: address,
    });
  }

  return apiFetch<ApiResource<Order> & { payment?: OnlineOrderPaymentAction }>(
    "/api/v1/public/orders",
    request,
  ).then((res) => ({
    order: res.data,
    // Defaulting rather than trusting the key to be there: a missing action
    // means "nothing more to do", which is the safe reading — it shows the
    // confirmation instead of navigating somewhere on a half-understood body.
    payment: res.payment ?? { type: "none" },
  }));
}

// The shop confirming an order. Sending payment_status: "paid" settles the
// order's payment record server-side too, so accepting an order and marking
// its money received is one request, not two.
export function updateOrder(
  id: number | string,
  payload: UpdateOrderPayload,
): Promise<Order> {
  return apiFetch<ApiResource<Order>>(`/api/v1/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
