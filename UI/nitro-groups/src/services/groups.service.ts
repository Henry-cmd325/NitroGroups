import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/services/auth.service";
import type { MusicGroup } from "@/types/MusicGroup";
import type { GenreResponse } from "@/types/Genre";
import type { GroupMediaResponse } from "@/types/GroupMedia";

export interface CreateGroupRequest {
    ownerUserId: number;
    slug: string;
    groupName: string;
    description: string;
    biography: string;
    numMembers: number;
    yearsExperience: number;
    phone: string;
    email: string;
    locationText: string;
    serviceRadiusKm: number;
    currency: string;
    basePrice?: number;
    hourlyRate?: number;
    minimumDurationHours: number;
    setupTimeMinutes: number;
    isAcceptingBookings: boolean;
    active: boolean;
}

export interface UpdateGroupRequest {
    slug: string;
    groupName: string;
    description: string;
    biography: string;
    numMembers: number;
    yearsExperience: number;
    phone: string;
    email: string;
    locationText: string;
    serviceRadiusKm: number;
    currency: string;
    basePrice?: number;
    hourlyRate?: number;
    minimumDurationHours: number;
    setupTimeMinutes: number;
    isAcceptingBookings: boolean;
    profilePictureUrl?: string;
    coverImageUrl?: string;
}

export interface GroupResponse {
    id: number;
    ownerUserId: number;
    slug: string;
    groupName: string;
    description: string;
    biography: string;
    numMembers: number;
    yearsExperience: number;
    phone: string;
    email: string;
    locationText: string;
    serviceRadiusKm: number;
    currency: string;
    basePrice?: number;
    hourlyRate?: number;
    minimumDurationHours: number;
    setupTimeMinutes: number;
    isAcceptingBookings: boolean;
    active: boolean;
    profilePictureUrl?: string;
    coverImageUrl?: string;
    genres?: GenreResponse[];
    media?: GroupMediaResponse[];
}

export type GenreListItem = {
    id: number;
    name: string;
    slug: string;
    colorHex?: string;
};

export const groupsService = {
    /**
     * Create a new music group.
     * POST /api/groups
     * Backend: GroupRequest -> Group
     */
    create: async (request: CreateGroupRequest): Promise<GroupResponse> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.post<GroupResponse>(
            "/groups",
            request,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        return data;
    },

    /**
     * Check if a group name/slug is available.
     * GET /api/groups/check-slug/:slug
     */
    checkSlugAvailability: async (slug: string): Promise<boolean> => {
        try {
            const accessToken = await getApiAccessToken();
            const { data } = await apiClient.get<{ available: boolean }>(
                `/groups/check-slug/${slug}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            return data.available;
        } catch {
            // If endpoint doesn't exist yet, assume available
            return true;
        }
    },
    getByUserId: async (userId: number): Promise<MusicGroup | null> => {
        const accessToken = await getApiAccessToken();
        try {
            const { data } = await apiClient.get<MusicGroup | MusicGroup[]>(
                `/users/${userId}/groups`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            if (Array.isArray(data)) {
                return data[0] ?? null;
            }
            return data;
        } catch (error: unknown) {
            // Let 404 errors propagate so React Query can retry
            // (group may not be created yet by outbox processor)
            throw error;
        }
    },

    getBySlug: async (slug: string): Promise<MusicGroup> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.get<MusicGroup>(
            `/groups/slug/${slug}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        return data;
    },

    update: async (id: number, payload: UpdateGroupRequest): Promise<MusicGroup> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.put<MusicGroup>(
            `/groups/${id}`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        return data;
    },

    /* ── Genre endpoints ── */

    listGenres: async (): Promise<GenreListItem[]> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.get<GenreListItem[]>("/genres", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return data;
    },

    assignGenres: async (groupId: number, genreIds: number[]): Promise<void> => {
        const accessToken = await getApiAccessToken();
        await apiClient.post(`/groups/${groupId}/genres`, { genreIds }, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    },

    removeGenre: async (groupId: number, genreId: number): Promise<void> => {
        const accessToken = await getApiAccessToken();
        await apiClient.delete(`/groups/${groupId}/genres/${genreId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    },

    /* ── Media endpoints ── */

    addMedia: async (groupId: number, payload: { type: string; url: string; thumbnailUrl?: string; title?: string; displayOrder?: number }): Promise<{ id: number }> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.post<{ id: number }>(`/groups/${groupId}/media`, payload, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return data;
    },

    removeMedia: async (groupId: number, mediaId: number): Promise<void> => {
        const accessToken = await getApiAccessToken();
        await apiClient.delete(`/groups/${groupId}/media/${mediaId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    },
};

/**
 * Generate a URL-friendly slug from a group name
 */
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
        .replace(/\s+/g, "-") // Replace spaces with dashes
        .replace(/-+/g, "-") // Remove duplicate dashes
        .trim();
}

