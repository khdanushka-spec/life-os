import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { User } from "@/generated/prisma/client";

// Supabase owns auth.users; nothing there automatically creates a row in
// our own User table, so every entry point upserts one lazily instead of
// relying on a signup hook.
async function upsertDbUserFromSession(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  return prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email },
    create: { id: user.id, email: user.email },
  });
}

// For Server Components / Server Actions, where redirecting is the right
// failure mode.
export async function requireDbUser(): Promise<User> {
  const dbUser = await upsertDbUserFromSession();
  if (!dbUser) redirect("/login");
  return dbUser;
}

// For Route Handlers, where redirect() doesn't make sense for a fetch()
// caller - the caller checks for null and returns its own error response.
export async function getDbUser(): Promise<User | null> {
  return upsertDbUserFromSession();
}
