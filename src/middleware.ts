import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";

/**
 * We check for any cookie whose name starts with "sb-" (Supabase auth cookies).
 * Supabase sets "sb-<project-ref>-auth-token" after a successful sign-in when
 * persistSession:true. We only need to verify its presence here — the actual
 * validity of the token is verified on the server in sensitive API routes via
 * the service-role client.
 */
function hasSupabaseSession(request: NextRequest): boolean {
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  return cookieNames.some((name) => name.startsWith("sb-") && name.endsWith("-auth-token"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow the login page and Next.js internals to pass through.
  if (pathname === LOGIN_PATH) {
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
    "/((?!_next/static|_next/image|favicon.ico|logoSirkito\\.jpg|.*\\.svg).*)",
  ],
};
