"use client";

import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/features/groups/types/User";
import { usersService } from "@/services/users.service";
import { useQuery } from "@tanstack/react-query";

export interface CurrentUserData {
    user: User | null;
    auth0User: ReturnType<typeof useAuth>["user"];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
}

/**
 * Hook to get current user data from both our custom auth session and the database.
 * Combines custom session data with PostgreSQL user record.
 */
export function useCurrentUser(): CurrentUserData {
    const { user: authUser, isLoading: authLoading } = useAuth();

    const {
        data: dbUser,
        isLoading: dbLoading,
        isError,
        error: dbError,
    } = useQuery({
        queryKey: ["current-user", authUser?.sub],
        queryFn: async () => {
            if (!authUser?.sub) throw new Error("No auth user");
            return usersService.getByAuth0Id(authUser.sub);
        },
        enabled: !!authUser?.sub && !authLoading,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        retry: 1,
    });

    return {
        user: dbUser ?? null,
        auth0User: authUser ?? null,
        isLoading: authLoading || (!!authUser && dbLoading),
        isError,
        error: (dbError as Error) ?? null,
    };
}
