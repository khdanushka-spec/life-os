"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

function todayDate(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

const createHabitSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140),
});

export async function createHabitAction(formData: FormData) {
  const dbUser = await requireDbUser();

  const parsed = createHabitSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) return;

  await prisma.habit.create({
    data: { userId: dbUser.id, title: parsed.data.title },
  });

  revalidatePath("/habits");
  revalidatePath("/home");
}

export async function toggleHabitTodayAction(habitId: string, done: boolean) {
  const dbUser = await requireDbUser();

  // Ownership check via the join, so you can't toggle someone else's habit.
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: dbUser.id },
  });
  if (!habit) return;

  const date = todayDate();

  if (done) {
    await prisma.habitLog.upsert({
      where: { habitId_date: { habitId, date } },
      update: {},
      create: { habitId, date },
    });
  } else {
    await prisma.habitLog
      .delete({ where: { habitId_date: { habitId, date } } })
      .catch(() => {
        // wasn't logged today - fine
      });
  }

  revalidatePath("/habits");
  revalidatePath("/home");
}

export async function deleteHabitAction(habitId: string) {
  const dbUser = await requireDbUser();

  await prisma.habit.deleteMany({
    where: { id: habitId, userId: dbUser.id },
  });

  revalidatePath("/habits");
  revalidatePath("/home");
}
