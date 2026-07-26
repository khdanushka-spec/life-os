"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { generateHealthReport } from "@/lib/ai/health";
import { MealType, MedicalRecordType, type ReportPeriod } from "@/generated/prisma/client";

function revalidateHealth(subpath?: string) {
  revalidatePath("/health");
  revalidatePath("/health/workouts");
  revalidatePath("/health/nutrition");
  revalidatePath("/health/medical");
  revalidatePath("/home");
  if (subpath) revalidatePath(subpath);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

// ---------- Daily check-in ----------

const dailyLogSchema = z.object({
  date: z.string().min(1),
  weightKg: z.coerce.number().positive().max(999).nullable().optional(),
  waterMl: z.coerce.number().int().min(0).max(20000).nullable().optional(),
  sleepHours: z.coerce.number().min(0).max(24).nullable().optional(),
  sleepQuality: z.coerce.number().int().min(1).max(5).nullable().optional(),
  wellbeingScore: z.coerce.number().int().min(1).max(10).nullable().optional(),
  note: optionalText(1000),
});

export async function upsertDailyHealthLogAction(input: z.input<typeof dailyLogSchema>) {
  const dbUser = await requireDbUser();
  const parsed = dailyLogSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { date, ...rest } = parsed.data;
  const day = new Date(date);

  await prisma.dailyHealthLog.upsert({
    where: { userId_date: { userId: dbUser.id, date: day } },
    update: rest,
    create: { userId: dbUser.id, date: day, ...rest },
  });

  revalidateHealth();
  return { success: true };
}

// ---------- Workouts ----------

const workoutSchema = z.object({
  type: z.string().trim().min(1, "Type is required.").max(60),
  performedAt: z.string().min(1, "Date/time is required."),
  durationMinutes: z.coerce.number().int().min(1).max(1440).nullable().optional(),
  caloriesBurned: z.coerce.number().int().min(1).max(10000).nullable().optional(),
  notes: optionalText(1000),
});

export async function createWorkoutAction(input: z.input<typeof workoutSchema>) {
  const dbUser = await requireDbUser();
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { performedAt, ...rest } = parsed.data;
  const workout = await prisma.workout.create({
    data: { userId: dbUser.id, ...rest, performedAt: new Date(performedAt) },
  });
  revalidateHealth();
  return { workout };
}

const workoutUpdateSchema = workoutSchema.partial();

export async function updateWorkoutAction(workoutId: string, input: z.input<typeof workoutUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = workoutUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { performedAt, ...rest } = parsed.data;
  await prisma.workout.updateMany({
    where: { id: workoutId, userId: dbUser.id },
    data: { ...rest, ...(performedAt !== undefined ? { performedAt: new Date(performedAt) } : {}) },
  });
  revalidateHealth();
  return { success: true };
}

export async function deleteWorkoutAction(workoutId: string) {
  const dbUser = await requireDbUser();
  await prisma.workout.deleteMany({ where: { id: workoutId, userId: dbUser.id } });
  revalidateHealth();
}

// ---------- Nutrition ----------

const nutritionSchema = z.object({
  mealType: z.nativeEnum(MealType),
  description: z.string().trim().min(1, "Description is required.").max(200),
  calories: z.coerce.number().int().min(1).max(10000).nullable().optional(),
  loggedAt: z.string().min(1, "Date/time is required."),
});

export async function createNutritionEntryAction(input: z.input<typeof nutritionSchema>) {
  const dbUser = await requireDbUser();
  const parsed = nutritionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { loggedAt, ...rest } = parsed.data;
  const entry = await prisma.nutritionEntry.create({
    data: { userId: dbUser.id, ...rest, loggedAt: new Date(loggedAt) },
  });
  revalidateHealth();
  return { entry };
}

const nutritionUpdateSchema = nutritionSchema.partial();

export async function updateNutritionEntryAction(entryId: string, input: z.input<typeof nutritionUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = nutritionUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { loggedAt, ...rest } = parsed.data;
  await prisma.nutritionEntry.updateMany({
    where: { id: entryId, userId: dbUser.id },
    data: { ...rest, ...(loggedAt !== undefined ? { loggedAt: new Date(loggedAt) } : {}) },
  });
  revalidateHealth();
  return { success: true };
}

export async function deleteNutritionEntryAction(entryId: string) {
  const dbUser = await requireDbUser();
  await prisma.nutritionEntry.deleteMany({ where: { id: entryId, userId: dbUser.id } });
  revalidateHealth();
}

// ---------- Medical records ----------

const medicalRecordSchema = z.object({
  type: z.nativeEnum(MedicalRecordType),
  title: z.string().trim().min(1, "Title is required.").max(200),
  provider: optionalText(120),
  notes: optionalText(2000),
  date: z.string().min(1, "Date is required."),
  followUpDate: z.string().nullable().optional(),
});

export async function createMedicalRecordAction(input: z.input<typeof medicalRecordSchema>) {
  const dbUser = await requireDbUser();
  const parsed = medicalRecordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { date, followUpDate, ...rest } = parsed.data;
  const record = await prisma.medicalRecord.create({
    data: {
      userId: dbUser.id,
      ...rest,
      date: new Date(date),
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    },
  });
  revalidateHealth();
  return { record };
}

const medicalRecordUpdateSchema = medicalRecordSchema.partial();

export async function updateMedicalRecordAction(recordId: string, input: z.input<typeof medicalRecordUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = medicalRecordUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { date, followUpDate, ...rest } = parsed.data;
  await prisma.medicalRecord.updateMany({
    where: { id: recordId, userId: dbUser.id },
    data: {
      ...rest,
      ...(date !== undefined ? { date: new Date(date) } : {}),
      ...(followUpDate !== undefined ? { followUpDate: followUpDate ? new Date(followUpDate) : null } : {}),
    },
  });
  revalidateHealth();
  return { success: true };
}

export async function deleteMedicalRecordAction(recordId: string) {
  const dbUser = await requireDbUser();
  await prisma.medicalRecord.deleteMany({ where: { id: recordId, userId: dbUser.id } });
  revalidateHealth();
}

// ---------- Reports ----------

export async function generateHealthReportAction(period: ReportPeriod, periodStart: string) {
  const dbUser = await requireDbUser();
  const summary = await generateHealthReport(dbUser.id, period, new Date(periodStart));
  revalidateHealth("/health/reports");
  return summary;
}
