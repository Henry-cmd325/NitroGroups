import { NextResponse } from "next/server";
import { getNitroSession } from "@/services/session";

export async function GET() {
    try {
        const session = await getNitroSession();

        if (!session || !session.accessToken) {
            return NextResponse.json(
                { error: "No authenticated session" },
                { status: 401 }
            );
        }

        return NextResponse.json({
            accessToken: session.accessToken,
        });
    } catch {
        return NextResponse.json(
            { error: "Error retrieving token" },
            { status: 500 }
        );
    }
}
