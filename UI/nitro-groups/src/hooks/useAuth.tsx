"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

interface AuthUser {
    sub: string;
    email: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email_verified?: boolean;
    nickname?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            // The nitro_session cookie is httpOnly, so we can't check it from JS.
            // Use a localStorage flag set during login to avoid unnecessary 401s on public pages.
            const hasSession = typeof window !== "undefined"
                && localStorage.getItem("nitro_logged_in") === "true";

            if (!hasSession) {
                setUser(null);
                return;
            }

            const res = await fetch("/api/auth/profile");
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                // Session expired or invalid — clear the flag
                setUser(null);
                localStorage.removeItem("nitro_logged_in");
            }
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const refreshUser = useCallback(async () => {
        setIsLoading(true);
        await fetchUser();
    }, [fetchUser]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    return useContext(AuthContext);
}
