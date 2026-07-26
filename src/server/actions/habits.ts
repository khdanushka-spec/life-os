"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { brisbaneToday, brisbaneDateKey, brisbaneHour } from "@/lib/date";
import {
  computeLongestStreak,
  computeConsistency30,
  computePerfectDayStreak,
  evaluateQualifyingAchievements,
  type HabitConsistencyInput,
} from "@/lib/habits";
import {
  HabitSchedule,
  HabitTimeOfDay,
  HabitGoalType,
  HabitDifficulty,
  HabitPriority,
} from "@/generated/prisma/client";

export type HabitFormState = { error?: string; success?: string };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

const boolField = (defaultValue: boolean) =>
  z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === null || v === undefined ? defaultValue : v === "true"));

const habitSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(140),
  description: optionalText(500),
  icon: z.string().trim().min(1).max(8).default("✨"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color.")
    .default("#6366f1"),
  categoryId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  timeOfDay: z.nativeEnum(HabitTimeOfDay).default("ANYTIME"),
  schedule: z.nativeEnum(HabitSchedule).default("DAILY"),
  customDays: z.array(z.coerce.number().int().min(0).max(6)).default([]),
  goalType: z.nativeEnum(HabitGoalType).default("ONCE"),
  targetCount: z.coerce.number().int().min(1).max(9999).optional(),
  targetUnit: optionalText(30),
  estimatedMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  difficulty: z.nativeEnum(HabitDifficulty).default("MEDIUM"),
  priority: z.nativeEnum(HabitPriority).default("MEDIUM"),
  motivation: optionalText(500),
  reward: optionalText(200),
  reminderEnabled: boolField(false),
  reminderTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  reminderSound: boolField(true),
});

function formDataToHabitInput(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon") || undefined,
    color: formData.get("color") || undefined,
    categoryId: formData.get("categoryId"),
    timeOfDay: formData.get("timeOfDay") || undefined,
    schedule: formData.get("schedule") || undefined,
    customDays: formData.getAll("customDays"),
    goalType: formData.get("goalType") || undefined,
    targetCount: formData.get("targetCount") || undefined,
    targetUnit: formData.get("targetUnit") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes") || undefined,
    difficulty: formData.get("difficulty") || undefined,
    priority: formData.get("priority") || undefined,
    motivation: formData.get("motivation"),
    reward: formData.get("reward"),
    reminderEnabled: formData.get("reminderEnabled"),
    reminderTime: formData.get("reminderTime") || undefined,
    reminderSound: formData.get("reminderSound"),
  };
}

type HabitInput = z.infer<typeof habitSchema>;

function toHabitData(data: HabitInput) {
  return {
    title: data.title,
    description: data.description ?? null,
    icon: data.icon,
    color: data.color,
    categoryId: data.categoryId ?? null,
    timeOfDay: data.timeOfDay,
    schedule: data.schedule,
    customDays: data.schedule === "CUSTOM" ? data.customDays : [],
    goalType: data.goalType,
    targetCount: data.goalType === "MULTIPLE" ? (data.targetCount ?? null) : null,
    targetUnit: data.goalType === "MULTIPLE" ? (data.targetUnit ?? null) : null,
    estimatedMinutes: data.estimatedMinutes ?? null,
    difficulty: data.difficulty,
    priority: data.priority,
    motivation: data.motivation ?? null,
    reward: data.reward ?? null,
    reminderEnabled: data.reminderEnabled,
    reminderTime: data.reminderEnabled ? (data.reminderTime ?? null) : null,
    reminderSound: data.reminderSound,
  };
}

async function assertOwnsCategory(userId: string, categoryId: string | undefined) {
  if (!categoryId) return;
  const owns = await prisma.habitCategory.findFirst({ where: { id: categoryId, userId } });
  if (!owns) throw new Error("Invalid category.");
}

export async function createHabitAction(
  _prevState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const dbUser = await requireDbUser();
  const parsed = habitSchema.safeParse(formDataToHabitInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await assertOwnsCategory(dbUser.id, parsed.data.categoryId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid category." };
  }

  await prisma.habit.create({
    data: { userId: dbUser.id, ...toHabitData(parsed.data) },
  });

  revalidatePath("/habits");
  revalidatePath("/home");
  return { success: "Habit created." };
}

export async function updateHabitAction(
  habitId: string,
  _prevState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const dbUser = await requireDbUser();
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: dbUser.id } });
  if (!habit) return { error: "Habit not found." };

  const parsed = habitSchema.safeParse(formDataToHabitInput(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await assertOwnsCategory(dbUser.id, parsed.data.categoryId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid category." };
  }

  await prisma.habit.update({
    where: { id: habitId },
    data: toHabitData(parsed.data),
  });

  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  revalidatePath("/home");
  return { success: "Habit updated." };
}

export async function deleteHabitAction(habitId: string) {
  const dbUser = await requireDbUser();

  await prisma.habit.deleteMany({
    where: { id: habitId, userId: dbUser.id },
  });

  revalidatePath("/habits");
  revalidatePath("/home");
}

export async function duplicateHabitAction(habitId: string) {
  const dbUser = await requireDbUser();
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: dbUser.id } });
  if (!habit) return;

  await prisma.habit.create({
    data: {
      userId: dbUser.id,
      title: `${habit.title} (copy)`,
      description: habit.description,
      icon: habit.icon,
      color: habit.color,
      categoryId: habit.categoryId,
      timeOfDay: habit.timeOfDay,
      schedule: habit.schedule,
      customDays: habit.customDays,
      goalType: habit.goalType,
      targetCount: habit.targetCount,
      targetUnit: habit.targetUnit,
      estimatedMinutes: habit.estimatedMinutes,
      difficulty: habit.difficulty,
      priority: habit.priority,
      motivation: habit.motivation,
      reward: habit.reward,
      reminderEnabled: habit.reminderEnabled,
      reminderTime: habit.reminderTime,
      reminderSound: habit.reminderSound,
    },
  });

  revalidatePath("/habits");
}

export async function setHabitArchivedAction(habitId: string, archived: boolean) {
  const dbUser = await requireDbUser();
  await prisma.habit.updateMany({ where: { id: habitId, userId: dbUser.id }, data: { archived } });
  revalidatePath("/habits");
}

const categorySchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color."),
  icon: z.string().trim().min(1).max(8).default("🏷️"),
});

// Called directly from client code (not via a <form>), so it can return
// the created/existing category's id for immediate use in the habit form.
export async function createHabitCategoryAction(input: { name: string; color: string; icon?: string }) {
  const dbUser = await requireDbUser();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const category = await prisma.habitCategory.upsert({
    where: { userId_name: { userId: dbUser.id, name: parsed.data.name } },
    update: {},
    create: {
      userId: dbUser.id,
      name: parsed.data.name,
      color: parsed.data.color,
      icon: parsed.data.icon,
    },
  });

  revalidatePath("/habits");
  return category;
}

// Re-evaluates every achievement from scratch and persists any newly
// qualifying ones. Cheap at personal-habit-tracker scale (dozens of
// habits, hundreds of logs) - not worth a smarter incremental check yet.
async function evaluateAndPersistAchievements(userId: string): Promise<void> {
  const habits = await prisma.habit.findMany({
    where: { userId },
    include: { logs: true },
  });

  let totalCompletions = 0;
  let maxLongestStreak = 0;
  let maxStreakHabitId: string | null = null;
  let earlyBirdCount = 0;
  let nightOwlCount = 0;
  const consistencyInputs: HabitConsistencyInput[] = [];

  for (const habit of habits) {
    totalCompletions += habit.logs.length;
    const logDateKeys = new Set(habit.logs.map((log) => log.date.toISOString().slice(0, 10)));
    const createdAtKey = brisbaneDateKey(habit.createdAt);
    const longest = computeLongestStreak(habit, logDateKeys, createdAtKey);
    if (longest > maxLongestStreak) {
      maxLongestStreak = longest;
      maxStreakHabitId = habit.id;
    }
    consistencyInputs.push({
      schedule: habit.schedule,
      customDays: habit.customDays,
      createdAtKey,
      logDateKeys,
    });

    for (const log of habit.logs) {
      if (!log.completedAt) continue;
      const hour = brisbaneHour(log.completedAt);
      if (hour < 8) earlyBirdCount++;
      if (hour >= 21) nightOwlCount++;
    }
  }

  const qualifying = evaluateQualifyingAchievements({
    totalHabits: habits.length,
    totalCompletions,
    maxLongestStreak,
    perfectDayStreak: computePerfectDayStreak(consistencyInputs),
    consistency30: computeConsistency30(consistencyInputs),
    earlyBirdCount,
    nightOwlCount,
  });

  const existing = await prisma.habitAchievement.findMany({
    where: { userId },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map((e) => e.key));
  const newKeys = qualifying.filter((key) => !existingKeys.has(key));
  if (newKeys.length === 0) return;

  await prisma.habitAchievement.createMany({
    data: newKeys.map((key) => ({
      userId,
      key,
      habitId: key === "STREAK_7" || key === "STREAK_30" ? maxStreakHabitId : null,
    })),
  });
}

export async function toggleHabitTodayAction(
  habitId: string,
  done: boolean,
  options?: { note?: string; value?: number },
) {
  const dbUser = await requireDbUser();

  // Ownership check via the join, so you can't toggle someone else's habit.
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: dbUser.id },
  });
  if (!habit) return;

  const date = brisbaneToday();

  if (done) {
    await prisma.habitLog.upsert({
      where: { habitId_date: { habitId, date } },
      update: { note: options?.note, value: options?.value, completedAt: new Date() },
      create: {
        habitId,
        date,
        note: options?.note,
        value: options?.value,
        completedAt: new Date(),
      },
    });
    await evaluateAndPersistAchievements(dbUser.id);
  } else {
    await prisma.habitLog
      .delete({ where: { habitId_date: { habitId, date } } })
      .catch(() => {
        // wasn't logged today - fine
      });
  }

  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  revalidatePath("/home");
}

// The "quick note" button - attaches a note to today's log. Recording a
// note for the day implies the habit was engaged with, so this creates
// today's log if it doesn't exist yet rather than requiring a separate
// completion step first.
export async function setHabitNoteAction(habitId: string, note: string) {
  const dbUser = await requireDbUser();
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: dbUser.id } });
  if (!habit) return;

  const date = brisbaneToday();
  const trimmed = note.trim().slice(0, 500);

  await prisma.habitLog.upsert({
    where: { habitId_date: { habitId, date } },
    update: { note: trimmed || null },
    create: { habitId, date, note: trimmed || null, completedAt: new Date() },
  });

  await evaluateAndPersistAchievements(dbUser.id);
  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  revalidatePath("/home");
}
