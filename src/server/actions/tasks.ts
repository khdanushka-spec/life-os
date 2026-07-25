"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(280),
  dueDate: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : null)),
});

export async function createTaskAction(formData: FormData) {
  const dbUser = await requireDbUser();

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return;

  await prisma.task.create({
    data: {
      userId: dbUser.id,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/home");
}

export async function toggleTaskAction(taskId: string, done: boolean) {
  const dbUser = await requireDbUser();

  await prisma.task.updateMany({
    where: { id: taskId, userId: dbUser.id },
    data: {
      status: done ? "DONE" : "TODO",
      completedAt: done ? new Date() : null,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/home");
}

export async function deleteTaskAction(taskId: string) {
  const dbUser = await requireDbUser();

  await prisma.task.deleteMany({
    where: { id: taskId, userId: dbUser.id },
  });

  revalidatePath("/tasks");
  revalidatePath("/home");
}
