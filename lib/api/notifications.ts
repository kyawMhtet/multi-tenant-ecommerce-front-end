import { apiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  Notification,
  NotificationsPageParams,
  PaginatedResponse,
} from "@/lib/types";

export function getUnreadNotificationCount(): Promise<number> {
  return apiFetch<ApiResource<{ count: number }>>("/api/v1/notifications/unread-count").then(
    (res) => res.data.count,
  );
}

export function getNotifications(
  params: NotificationsPageParams = {},
): Promise<PaginatedResponse<Notification>> {
  const query = new URLSearchParams();
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.unread_only) query.set("unread_only", "true");
  const qs = query.toString();

  return apiFetch<PaginatedResponse<Notification>>(
    `/api/v1/notifications${qs ? `?${qs}` : ""}`,
  );
}

// Both return 204 No Content — apiFetch already returns null for a
// non-JSON body, so there's nothing to unwrap here.
export function markNotificationRead(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>("/api/v1/notifications/read-all", { method: "POST" });
}
