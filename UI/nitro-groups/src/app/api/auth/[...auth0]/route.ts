import { auth0 } from "@/lib/auth0";
import { type NextRequest } from "next/server";

export const GET = (req: NextRequest) => auth0.middleware(req);
export const POST = (req: NextRequest) => auth0.middleware(req);
