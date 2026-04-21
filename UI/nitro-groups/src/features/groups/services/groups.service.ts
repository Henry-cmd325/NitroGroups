import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/services/auth.service";

export interface GroupsResponse {
    id: number;
}

export const groupsService = {
    getAll: async (): Promise<GroupsResponse[]> => {
        const accessToken = await getApiAccessToken();

        const { data } = await apiClient.get<GroupsResponse[]>(
            "/groups",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        return data;
    },
};
