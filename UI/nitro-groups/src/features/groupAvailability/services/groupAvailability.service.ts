import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/services/auth.service";
import type { CreateBlockRequest, CreateBlockResponse, DeleteResponse, DeleteScheduleItemRequest, ListScheduleRequest, ListScheduleResponse, ScheduleItem, UpdateScheduleItemRequest, UpdateScheduleItemResponse } from "../types/groupAvailability.types";
import { B2B_GROUPAVAILABILITY_ENDPOINT } from "../types/groupAvailability.types";

export const groupAvailabilityService = {
  listSchedule: async (params: ListScheduleRequest): Promise<ListScheduleResponse> => {
    const accessToken = await getApiAccessToken();
    const path = B2B_GROUPAVAILABILITY_ENDPOINT.replace("{groupId}", String(params.groupId));
    const { data } = await apiClient.get<ListScheduleResponse>(path, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { start: params.start, end: params.end, source: params.source, typeFilter: params.typeFilter },
    });
    return data;
  },
  createBlock: async (body: CreateBlockRequest): Promise<CreateBlockResponse> => {
    const accessToken = await getApiAccessToken();
    const path = B2B_GROUPAVAILABILITY_ENDPOINT.replace("{groupId}", String(body.groupId));
    const { groupId, idempotencyKey, ...rest } = body;
    const { data } = await apiClient.post<CreateBlockResponse>(path, rest, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Idempotency-Key": idempotencyKey,
      },
    });
    return data;
  },
  deleteScheduleItem: async (params: DeleteScheduleItemRequest): Promise<DeleteResponse> => {
    const accessToken = await getApiAccessToken();
    const path = `${B2B_GROUPAVAILABILITY_ENDPOINT.replace("{groupId}", String(params.groupId))}/${params.id}`;
    const { data } = await apiClient.delete<DeleteResponse>(path, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  },
  updateScheduleItem: async (body: UpdateScheduleItemRequest): Promise<UpdateScheduleItemResponse> => {
    const accessToken = await getApiAccessToken();
    const path = `${B2B_GROUPAVAILABILITY_ENDPOINT.replace("{groupId}", String(body.groupId))}/${body.id}`;
    const { groupId, id, ...patch } = body;
    const { data } = await apiClient.patch<UpdateScheduleItemResponse>(path, patch, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  },
};
