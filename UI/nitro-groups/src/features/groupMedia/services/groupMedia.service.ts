import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/services/auth.service";
import type { GroupMediaListResponse, ListGroupMediaRequest } from "../types/groupMedia.types";
import { B2B_GROUPMEDIA_ENDPOINT } from "../types/groupMedia.types";

export const groupMediaService = {
  listGroupMedia: async (params: ListGroupMediaRequest): Promise<GroupMediaListResponse> => {
    const accessToken = await getApiAccessToken();
    const path = B2B_GROUPMEDIA_ENDPOINT.replace("{groupId}", String(params.groupId));
    const { data } = await apiClient.get<GroupMediaListResponse>(path, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { after: params.after, limit: params.limit, sort: params.sort, order: params.order },
    });
    return data;
  },
};