import { apiClient } from "@/lib/api-client";
import type { GroupMediaListResponse, ListGroupMediaRequest } from "../types/groupMedia.types";
import { B2B_GROUPMEDIA_ENDPOINT } from "../types/groupMedia.types";

function groupMediaPath(groupId: number): string {
  return B2B_GROUPMEDIA_ENDPOINT
    .replace("{groupId}", String(groupId))
    .replace(/^\/api/, "");
}

export const groupMediaService = {
  listGroupMedia: async (params: ListGroupMediaRequest): Promise<GroupMediaListResponse> => {
    const path = groupMediaPath(params.groupId);
    const { data } = await apiClient.get<GroupMediaListResponse>(path, {
      params: { after: params.after, limit: params.limit, sort: params.sort, order: params.order },
    });
    return data;
  },
};