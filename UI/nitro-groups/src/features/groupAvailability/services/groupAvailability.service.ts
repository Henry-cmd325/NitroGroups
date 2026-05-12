import { apiClient } from "@/lib/api-client";
import type { CreateBlockRequest, CreateBlockResponse, DeleteResponse, DeleteScheduleItemRequest, ListScheduleRequest, ListScheduleResponse, UpdateScheduleItemRequest, UpdateScheduleItemResponse } from "../types/groupAvailability.types";
import { B2B_GROUPAVAILABILITY_ENDPOINT } from "../types/groupAvailability.types";

function schedulePath(groupId: number): string {
  return B2B_GROUPAVAILABILITY_ENDPOINT
    .replace("{groupId}", String(groupId))
    .replace(/^\/api/, "");
}

export const groupAvailabilityService = {
  listSchedule: async (params: ListScheduleRequest): Promise<ListScheduleResponse> => {
    const path = schedulePath(params.groupId);
    const { data } = await apiClient.get<ListScheduleResponse>(path, {
      params: { start: params.start, end: params.end, source: params.source, typeFilter: params.typeFilter },
    });
    return data;
  },
  createBlock: async (body: CreateBlockRequest): Promise<CreateBlockResponse> => {
    const path = schedulePath(body.groupId);
    const { idempotencyKey, title, description, startAt, endAt } = body;
    const { data } = await apiClient.post<CreateBlockResponse>(path, { title, description, startAt, endAt }, {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    });
    return data;
  },
  deleteScheduleItem: async (params: DeleteScheduleItemRequest): Promise<DeleteResponse> => {
    const path = `${schedulePath(params.groupId)}/${params.id}`;
    const { data } = await apiClient.delete<DeleteResponse>(path);
    return data;
  },
  updateScheduleItem: async (body: UpdateScheduleItemRequest): Promise<UpdateScheduleItemResponse> => {
    const path = `${schedulePath(body.groupId)}/${body.id}`;
    const { title, description, startAt, endAt } = body;
    const patch = { title, description, startAt, endAt };
    const { data } = await apiClient.patch<UpdateScheduleItemResponse>(path, patch);
    return data;
  },
};
