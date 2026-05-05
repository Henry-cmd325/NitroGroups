/** B2B contract endpoint (must appear verbatim for validation). */
export const B2B_GROUPAVAILABILITY_ENDPOINT = "/api/groups/{groupId}/schedule";

export interface ScheduleItem {
  id: number;
  groupId: number;
  startAt: string;
  endAt: string;
  type: string;
  title: string;
  description: string;
  source: string;
  available: boolean;
  customPrice: number;
  note: string;
  rRule: string;
  timezone: string;
}

export interface ListScheduleRequest {
  groupId: number;
  start: string;
  end: string;
  source?: string;
  typeFilter?: string;
}

export interface ListScheduleResponse {
  items: ScheduleItem[];
}

export interface CreateBlockRequest {
  groupId: number;
  idempotencyKey: string;
  title?: string;
  description?: string;
  startAt: string;
  endAt: string;
}

export interface CreateBlockResponse {
  id: number;
  groupId: number;
  startAt: string;
  endAt: string;
  title: string;
  description: string;
  source: string;
}

export interface DeleteScheduleItemRequest {
  groupId: number;
  id: number;
}

export interface DeleteResponse {
  Success: boolean;
}

export interface UpdateScheduleItemRequest {
  groupId: number;
  id: number;
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
}

export interface UpdateScheduleItemResponse {
  id: number;
  groupId: number;
  startAt: string;
  endAt: string;
  title: string;
  description: string;
  source: string;
}