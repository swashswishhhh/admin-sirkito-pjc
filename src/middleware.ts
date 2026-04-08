import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";

/**
 * We check for the explicit session cookie set by our Server Action.
 */
function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.has("sirkito-admin-session");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow the login page, Next.js internals, and API routes to pass through.
  if (pathname === LOGIN_PATH || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // If no session, redirect to login.
  if (!hasSupabaseSession(request)) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - public folder assets (logoSirkito.jpg, etc.)
     * - API routes (secured separately by the service-role key requirement)
     */
    "/((?!_next/static|_next/image|favicon.ico|logoSirkito\\.jpg|.*\\.svg|api/).*)",
  ],
};
