import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export interface NitroSession {
    user: {
        sub: string;
        email: string;
        name: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
        email_verified?: boolean;
        nickname?: string;
    };
    accessToken: string;
    idToken: string;
    refreshToken?: string;
    expiresAt: number;
}

/**
 * Get the current session from our custom JWT cookie.
 * Returns null if no valid session exists.
 */
export async function getNitroSession(): Promise<NitroSession | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("nitro_session");

        if (!sessionCookie?.value) {
            return null;
        }

        const secret = new TextEncoder().encode(
            process.env.AUTH0_SECRET || "default-secret-change-me"
        );

        const { payload } = await jwtVerify(sessionCookie.value, secret);
        return (payload as { session: NitroSession }).session;
    } catch {
        return null;
    }
}
