import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/services/auth.service";
import { User, CreateUserDto, UpdateUserDto } from "@/features/groups/types/User";

export const usersService = {
    /**
     * Create a new user in the database
     */
    create: async (userData: CreateUserDto): Promise<User> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.post<User>("/users", userData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return data;
    },

    /**
     * Get user by ID
     */
    getById: async (userId: number): Promise<User> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.get<User>(`/users/${userId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return data;
    },

    /**
     * Get user by Auth0 ID
     */
    getByAuth0Id: async (auth0Id: string): Promise<User> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.get<User>(`/users/auth0/${auth0Id}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return data;
    },

    /**
     * Update user profile
     */
    update: async (userId: number, userData: UpdateUserDto): Promise<User> => {
        const accessToken = await getApiAccessToken();
        const { data } = await apiClient.put<User>(`/users/${userId}`, userData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return data;
    },

    /**
     * Sync user from Auth0 to database
     * Creates user if doesn't exist, updates last_login_at if exists
     */
    syncFromAuth0: async (auth0User: {
        sub: string;
        email: string;
        name?: string;
        picture?: string;
        user_metadata?: {
            user_type?: string;
        };
    }): Promise<User> => {
        const accessToken = await getApiAccessToken();

        // Split name into first and last name
        const nameParts = auth0User.name?.split(' ') || ['', ''];
        const firstName = nameParts[0] || auth0User.email.split('@')[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        // Map userType to backend string enum: Client, Musician, BandMember, Admin
        const typeMap: Record<string, string> = { client: 'Client', musician: 'Musician', band_member: 'BandMember' };
        const rawType = (auth0User.user_metadata?.user_type || 'musician').toLowerCase();
        const userType = typeMap[rawType] ?? 'Musician';

        const { data } = await apiClient.post<User>(
            "/auth/sync",
            {
                auth0Id: auth0User.sub,
                email: auth0User.email,
                firstName,
                lastName,
                profilePictureUrl: auth0User.picture,
                userType,
                origin: 'signup',
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        return data;
    },
};
