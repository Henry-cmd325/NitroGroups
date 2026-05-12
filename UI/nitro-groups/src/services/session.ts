import { cookies } from "next/headers";
import { verifyNitroSessionToken, type NitroSession } from "@/services/session-token";

export type { NitroSession } from "@/services/session-token";

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

        return await verifyNitroSessionToken(sessionCookie.value);
    } catch {
        return null;
    }
}
