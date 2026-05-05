import { NextResponse } from "next/server";
import { getNitroSession } from "@/services/session";

export async function GET() {
    try {
        const session = await getNitroSession();

        if (!session) {
            return NextResponse.json(null, { status: 401 });
        }

        return NextResponse.json(session.user);
    } catch {
        return NextResponse.json(null, { status: 401 });
    }
}
