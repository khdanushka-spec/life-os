import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_MS,
  ADMIN_SESSION_RENEW_THRESHOLD_MS,
} from "@/lib/auth/constants";

// The raw token only ever lives in the httpOnly cookie. What's stored in
// the database is its SHA-256 hash, so a leaked DB row can't be replayed
// as a valid session cookie.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(20).toString("base64url");
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS);

  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt },
  });

  return { token, expiresAt };
}

export async function validateSessionToken(
  token: string,
): Promise<User | null> {
  const sessionId = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return null;
  }

  // Sliding expiration: extend once the session is more than halfway to expiry.
  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining < ADMIN_SESSION_RENEW_THRESHOLD_MS) {
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS);
    await prisma.session.update({ where: { id: sessionId }, data: { expiresAt } });
  }

  return session.user;
}

export async function invalidateSessionToken(token: string): Promise<void> {
  await prisma.session.delete({ where: { id: hashToken(token) } }).catch(() => {
    // already gone - fine
  });
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
}
