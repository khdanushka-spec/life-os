import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { checkAdminSession } from "@/lib/auth/proxy";

export async function proxy(request: NextRequest) {
  const adminRedirect = checkAdminSession(request);
  if (adminRedirect) return adminRedirect;

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
