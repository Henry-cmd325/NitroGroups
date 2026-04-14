import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/services/auth.service";

export interface CreateMusicianRequest {
    userInfo: {
        auth0Id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone?: string;
        userType: number;  // Backend enum: Client=0, Musician=1, BandMember=2
        origin: number;    // Backend enum: SignUp=0, GroupContact=1
    };
    musicianProfile: {
        shortBio?: string;
        yearsExperience: number;
        isOpenToJoin: boolean;
        createGroup: boolean;
        groupName?: string;
    };
    idGroup: number;
}

export interface MusicianDto {
    id: number;
    userId: number;
    yearsExperience: number;
    shortBio?: string;
    isOpenToJoin: boolean;
}

export const musiciansService = {
    /**
     * Create a musician profile.
     * POST /api/musicians
     * Backend: CreateMusicianRequest -> CreateMusicianCommand -> MusicianDto
     */
    create: async (request: CreateMusicianRequest): Promise<MusicianDto> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.post<MusicianDto>(
            "/musicians",
            request,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Idempotency-Key": crypto.randomUUID(),
                },
            }
        );
        return data;
    },
};
