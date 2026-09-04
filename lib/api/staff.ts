import { apiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  StaffCollection,
  StaffMember,
  StoreStaffPayload,
  UpdateStaffPayload,
} from "@/lib/types";

export function getStaff(): Promise<StaffCollection> {
  return apiFetch<StaffCollection>("/api/v1/staff");
}

export function createStaff(payload: StoreStaffPayload): Promise<StaffMember> {
  return apiFetch<ApiResource<StaffMember>>("/api/v1/staff", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateStaff(
  id: number,
  payload: UpdateStaffPayload,
): Promise<StaffMember> {
  return apiFetch<ApiResource<StaffMember>>(`/api/v1/staff/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function deleteStaff(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/staff/${id}`, { method: "DELETE" });
}
