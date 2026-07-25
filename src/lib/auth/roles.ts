import type { UserRole } from "@/generated/prisma/client";

// Higher number = more privilege.
const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
};

export function hasRequiredRole(role: UserRole, minRole: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
