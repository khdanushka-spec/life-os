"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromCookies,
  invalidateSessionToken,
} from "@/lib/auth/session";

export type AdminAuthState = {
  error?: string;
};

const credentialsSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// A validly-formatted (but meaningless) hash to verify against when the
// username doesn't exist, so a login attempt takes the same amount of time
// whether or not the account is real - otherwise response time leaks which
// usernames exist.
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$4hZghEptrxfpnh3moAm8Gw$/arg/hbqUd+ny19esGYqS6nVmfqRB4bVjv9drNac/KI";

const INVALID_CREDENTIALS_ERROR = "Invalid username or password.";

export async function adminSignInAction(
  _prevState: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const parsed = credentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  const valid = await verifyPassword(
    user?.passwordHash ?? DUMMY_HASH,
    parsed.data.password,
  );

  if (!user || !user.passwordHash || !valid) {
    return { error: INVALID_CREDENTIALS_ERROR };
  }

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  redirect("/admin");
}

export async function adminSignOutAction() {
  const token = await getSessionTokenFromCookies();
  if (token) await invalidateSessionToken(token);
  await clearSessionCookie();
  redirect("/admin/login");
}
