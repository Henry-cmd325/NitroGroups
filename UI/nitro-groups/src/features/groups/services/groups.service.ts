import { apiClient } from "@/lib/api-client";

export interface GroupsResponse {
    id: number;
}

export const groupsService = {
    getAll: async (): Promise<GroupsResponse[]> => {
        const { data } = await apiClient.get<GroupsResponse[]>(
            "/groups"
        );

        return data;
    },
};
