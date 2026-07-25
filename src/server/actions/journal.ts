"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { Mood } from "@/generated/prisma/client";

const createEntrySchema = z.object({
  content: z.string().trim().min(1, "Entry can't be empty").max(5000),
  mood: z.nativeEnum(Mood).optional(),
});

export async function createJournalEntryAction(formData: FormData) {
  const dbUser = await requireDbUser();

  const rawMood = formData.get("mood");
  const parsed = createEntrySchema.safeParse({
    content: formData.get("content"),
    mood: rawMood ? rawMood : undefined,
  });
  if (!parsed.success) return;

  await prisma.journalEntry.create({
    data: {
      userId: dbUser.id,
      content: parsed.data.content,
      mood: parsed.data.mood,
    },
  });

  revalidatePath("/journal");
}

export async function deleteJournalEntryAction(entryId: string) {
  const dbUser = await requireDbUser();

  await prisma.journalEntry.deleteMany({
    where: { id: entryId, userId: dbUser.id },
  });

  revalidatePath("/journal");
}
