"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { Prisma } from "@/generated/prisma/client";
import type { AuthActionState } from "@/server/actions/auth";

const nicknameSchema = z.object({
  nickname: z.string().trim().max(30, "Nickname must be 30 characters or fewer."),
});

// Empty submission clears the nickname, reverting the greeting name back to
// the email-prefix fallback used across Home/Tasks/Finance/Journal.
export async function updateNicknameAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = nicknameSchema.safeParse({ nickname: formData.get("nickname") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const dbUser = await requireDbUser();
  const nickname = parsed.data.nickname.length > 0 ? parsed.data.nickname : null;

  try {
    await prisma.user.update({ where: { id: dbUser.id }, data: { username: nickname } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That nickname is already taken." };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return { success: "Nickname updated." };
}
