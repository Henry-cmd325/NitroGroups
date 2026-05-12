import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyNitroSessionToken } from "@/services/session-token";

// Backend API routes that should be proxied directly (via next.config.ts rewrites)
const BACKEND_API_PREFIXES = [
  "/api/musicians",
  "/api/groups",
  "/api/genres",
  "/api/users",
  "/api/auth/sync",
];

// Our custom auth API routes handled by Next.js route handlers
const CUSTOM_AUTH_ROUTES = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/profile",
];

const AUTH_PAGES = ["/login", "/signup"];

const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/groupmedia",
  "/groupavailability",
];

async function getSessionFromRequest(request: NextRequest) {
  const sessionCookie = request.cookies.get("nitro_session");

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    return await verifyNitroSessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromRequest(request);

  if (pathname === "/" && session?.user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if (AUTH_PAGES.includes(pathname) && session?.user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if (PROTECTED_ROUTE_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)) && !session?.user) {
    return redirectToLogin(request);
  }

  // Custom auth routes: let Next.js route handlers serve them
  if (CUSTOM_AUTH_ROUTES.some(route => pathname === route)) {
    return NextResponse.next();
  }

  // Backend API routes: keep tokens server-side and attach them before Next rewrites to .NET.
  if (BACKEND_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    if (!session?.accessToken) {
      return NextResponse.next();
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("Authorization", `Bearer ${session.accessToken}`);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // All other routes (pages, static assets, etc.): pass through normally
  // We do NOT use auth0.middleware() since we handle auth with our custom session
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
