import { SignJWT, jwtVerify } from "jose";

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
        user_type?: string;
    };
    accessToken: string;
    idToken: string;
    refreshToken?: string;
    expiresAt: number;
}

export function getRequiredAuth0Secret(): Uint8Array {
    const secret = process.env.AUTH0_SECRET?.trim();

    if (!secret) {
        throw new Error("AUTH0_SECRET is required to sign and verify Nitro session cookies.");
    }

    return new TextEncoder().encode(secret);
}

export async function signNitroSession(session: NitroSession): Promise<string> {
    return new SignJWT({ session })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(getRequiredAuth0Secret());
}

export async function verifyNitroSessionToken(token: string): Promise<NitroSession | null> {
    const { payload } = await jwtVerify(token, getRequiredAuth0Secret());
    const session = (payload as { session?: NitroSession }).session;

    if (!session?.user || !session.accessToken || !session.expiresAt) {
        return null;
    }

    if (session.expiresAt <= Math.floor(Date.now() / 1000)) {
        return null;
    }

    return session;
}
