"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/server/admin-user";

export async function approveUserAction(userId: string) {
  await requireAdminUser("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { status: "APPROVED" } });
  revalidatePath("/admin");
}

export async function rejectUserAction(userId: string) {
  await requireAdminUser("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { status: "REJECTED" } });
  revalidatePath("/admin");
}

// Undoes a reject (or lets an admin re-open a decision) - lands back in
// the Pending list rather than silently re-approving.
export async function resetToPendingAction(userId: string) {
  await requireAdminUser("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { status: "PENDING" } });
  revalidatePath("/admin");
}

// Role changes are more consequential than approve/reject (grants access to
// this same admin panel), so this requires SUPER_ADMIN specifically rather
// than the ADMIN floor the rest of this file uses. Can't demote yourself -
// that would let the only Super Admin lock themselves out.
export async function setUserRoleAction(userId: string, role: "USER" | "ADMIN" | "SUPER_ADMIN") {
  const admin = await requireAdminUser("SUPER_ADMIN");
  if (userId === admin.id) return;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}
