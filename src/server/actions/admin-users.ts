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

// Disable/enable/delete are all SUPER_ADMIN-only and all reject acting on
// your own row, same reasoning as setUserRoleAction - none of them should
// be able to lock out the only Super Admin.

export async function disableUserAction(userId: string) {
  const admin = await requireAdminUser("SUPER_ADMIN");
  if (userId === admin.id) return;
  await prisma.user.update({ where: { id: userId }, data: { status: "DISABLED" } });
  revalidatePath("/admin");
}

export async function enableUserAction(userId: string) {
  const admin = await requireAdminUser("SUPER_ADMIN");
  if (userId === admin.id) return;
  await prisma.user.update({ where: { id: userId }, data: { status: "APPROVED" } });
  revalidatePath("/admin");
}

// Hard delete - cascades to every life-area record the user owns (tasks,
// finance, journal, everything hangs off User via onDelete: Cascade). If
// they're still signed in with Supabase, their next request just resolves
// a brand-new PENDING row (see db-user.ts) rather than reviving the old
// one - Supabase auth itself isn't touched, only our own data.
export async function deleteUserAction(userId: string) {
  const admin = await requireAdminUser("SUPER_ADMIN");
  if (userId === admin.id) return;
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}
