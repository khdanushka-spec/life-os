import "server-only";
import { redirect } from "next/navigation";
import type { User, UserRole } from "@/generated/prisma/client";
import { getSessionTokenFromCookies, validateSessionToken } from "@/lib/auth/session";
import { hasRequiredRole } from "@/lib/auth/roles";
import { getDbUser } from "@/server/db-user";

// Authoritative check for admin routes - the proxy only does a cheap
// cookie-presence redirect; this is what actually validates the session
// against the database and enforces role.
//
// Two independent ways in: the separate local-admin cookie session
// (username/password via /admin/login), or an already-signed-in Supabase
// user whose role has been elevated past USER - so a Supabase-authenticated
// SUPER_ADMIN can reach /admin straight from the main app's sidebar link
// without a second login. Local-admin session checked first since it's a
// plain cookie lookup with no DB round trip on a miss.
export async function requireAdminUser(
  minRole: UserRole = "ADMIN",
): Promise<User> {
  const token = await getSessionTokenFromCookies();
  if (token) {
    const user = await validateSessionToken(token);
    if (user && hasRequiredRole(user.role, minRole)) return user;
  }

  const dbUser = await getDbUser();
  if (dbUser && hasRequiredRole(dbUser.role, minRole)) return dbUser;

  redirect("/admin/login");
}
