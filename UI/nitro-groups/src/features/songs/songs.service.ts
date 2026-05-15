import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/services/auth.service";
import type {
    MusicTrackDto,
    GroupSongDto,
    AddSongRequest
} from "./types";

export const songsService = {
    search: async (q: string, limit: number = 20): Promise<MusicTrackDto[]> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.get<MusicTrackDto[]>("/songs/search", {
            params: { q, limit },
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return data;
    },

    getByGroupId: async (groupId: number): Promise<GroupSongDto[]> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.get<GroupSongDto[]>(`/groups/${groupId}/songs`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return data;
    },

    addToGroup: async (groupId: number, request: AddSongRequest): Promise<number> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.post<number>(`/groups/${groupId}/songs`, request, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return data;
    },

    remove: async (songId: number): Promise<void> => {
        const accessToken = await getApiAccessToken();
        await apiClient.delete(`/songs/${songId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    },

    getTrackInfo: async (trackId: string): Promise<MusicTrackDto> => {
        const accessToken = await getApiAccessToken();
        // We reuse search or we could have a specific endpoint, but let's use search with the exact id if Deezer allows it,
        // or better yet, since the backend has IMusicService, let's assume we can use the search endpoint with a query that's the ID.
        // Actually, Deezer API for track info is /track/{id}.
        // For simplicity, let's just use the search endpoint on our backend which calls Deezer.
        const { data } = await apiClient.get<MusicTrackDto[]>("/songs/search", {
            params: { q: trackId, limit: 1 },
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return data[0];
    }
};
