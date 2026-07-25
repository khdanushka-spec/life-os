import "server-only";
import { redirect } from "next/navigation";
import type { User, UserRole } from "@/generated/prisma/client";
import { getSessionTokenFromCookies, validateSessionToken } from "@/lib/auth/session";
import { hasRequiredRole } from "@/lib/auth/roles";

// Authoritative check for admin routes - the proxy only does a cheap
// cookie-presence redirect; this is what actually validates the session
// against the database and enforces role.
export async function requireAdminUser(
  minRole: UserRole = "ADMIN",
): Promise<User> {
  const token = await getSessionTokenFromCookies();
  if (!token) redirect("/admin/login");

  const user = await validateSessionToken(token);
  if (!user || !hasRequiredRole(user.role, minRole)) {
    redirect("/admin/login");
  }

  return user;
}
