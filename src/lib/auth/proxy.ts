import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";

// Optimistic check only: does *some* session cookie exist - either the
// local-admin one, or a Supabase auth cookie (an elevated Supabase user can
// also reach /admin now, see requireAdminUser). The authoritative check
// (does it resolve to a real, unexpired session with sufficient role)
// happens in src/app/admin/(protected)/layout.tsx, which runs in the
// Node.js runtime and can talk to Postgres. Proxy runs on every request
// and shouldn't do that work itself - and can't reliably check Supabase's
// cookie name anyway (it's project-specific), so this only blocks the
// unambiguous "neither cookie exists" case.
export function checkAdminSession(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return null;
  }

  const hasAdminCookie = request.cookies.has(ADMIN_SESSION_COOKIE);
  // Supabase's auth cookie can be chunked (sb-<ref>-auth-token.0, .1, ...)
  // for large sessions, so match on the "sb-" prefix alone rather than an
  // exact name.
  const hasSupabaseCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasAdminCookie && !hasSupabaseCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return null;
}
