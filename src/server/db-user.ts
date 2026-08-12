import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Prisma, type User } from "@/generated/prisma/client";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// Supabase owns auth.users; nothing there automatically creates a row in
// our own User table, so every entry point resolves one lazily instead of
// relying on a signup hook. Deliberately not a single upsert(where: {id}):
// - email is also unique, so if a row already exists under this email with
//   a different id (e.g. the Supabase auth UID for this email changed),
//   upsert-by-id would try to INSERT a second row and hit the email unique
//   constraint instead of finding the existing one.
// - Next.js can fire several page loads concurrently (Home/Tasks/Aura Brain
//   all requesting at once on first login, as actually happened), so two
//   requests can both decide "no row exists yet" and race to create one.
// Every module page calls requireDbUser()/getDbUser() independently on top
// of the (app) layout already calling it - cache() dedupes all of those
// down to a single Supabase-auth + Prisma round trip per request instead of
// repeating the full lookup on every layout+page pair.
const resolveDbUserFromSession = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const byId = await prisma.user.findUnique({ where: { id: user.id } });
  if (byId) {
    return byId.email === user.email
      ? byId
      : prisma.user.update({
          where: { id: user.id },
          data: { email: user.email },
        });
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: user.email },
  });
  if (byEmail) return byEmail;

  try {
    // Overrides the schema's APPROVED default (which exists only to keep
    // already-existing rows from being locked out) - every genuinely new
    // Supabase signup requires an admin to approve it.
    return await prisma.user.create({
      data: { id: user.id, email: user.email, status: "PENDING" },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // Lost the race to a concurrent request - read back what it created.
      const existing = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (existing) return existing;
    }
    throw error;
  }
});

// For Server Components / Server Actions, where redirecting is the right
// failure mode.
export async function requireDbUser(): Promise<User> {
  const dbUser = await resolveDbUserFromSession();
  if (!dbUser) redirect("/login");
  return dbUser;
}

// For Route Handlers, where redirect() doesn't make sense for a fetch()
// caller - the caller checks for null and returns its own error response.
export async function getDbUser(): Promise<User | null> {
  return resolveDbUserFromSession();
}
