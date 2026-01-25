import { NextResponse } from "next/server";

const message = {
	error: "deprecated_route",
	message: "Auth0 v4 uses /auth/* routes mounted by middleware.",
};

export const GET = () => NextResponse.json(message, { status: 404 });
export const POST = () => NextResponse.json(message, { status: 404 });
