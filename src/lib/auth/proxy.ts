import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";

// Optimistic check only: does the admin session cookie exist? The
// authoritative check (does it match a real, unexpired session with
// sufficient role) happens in src/app/admin/(protected)/layout.tsx, which
// runs in the Node.js runtime and can talk to Postgres. Proxy runs on
// every request and shouldn't do that work itself.
export function checkAdminSession(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return null;
  }

  const hasSessionCookie = request.cookies.has(ADMIN_SESSION_COOKIE);
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return null;
}
