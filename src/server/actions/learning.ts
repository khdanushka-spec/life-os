"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { generateLearningReport } from "@/lib/ai/learning";
import { CourseStatus, BookStatus, type ReportPeriod } from "@/generated/prisma/client";

function revalidateLearning(subpath?: string) {
  revalidatePath("/learning");
  revalidatePath("/learning/courses");
  revalidatePath("/learning/books");
  revalidatePath("/learning/certificates");
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

const studyLogSchema = z.object({
  date: z.string().min(1),
  minutesStudied: z.coerce.number().int().min(0).max(1440).nullable().optional(),
  focusScore: z.coerce.number().int().min(1).max(5).nullable().optional(),
  note: optionalText(1000),
});

export async function upsertStudyLogAction(input: z.input<typeof studyLogSchema>) {
  const dbUser = await requireDbUser();
  const parsed = studyLogSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { date, ...rest } = parsed.data;
  const day = new Date(date);

  await prisma.studyLog.upsert({
    where: { userId_date: { userId: dbUser.id, date: day } },
    update: rest,
    create: { userId: dbUser.id, date: day, ...rest },
  });

  revalidateLearning();
  return { success: true };
}

// ---------- Courses ----------

const courseSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  provider: optionalText(120),
  status: z.nativeEnum(CourseStatus),
  progressPercent: z.coerce.number().int().min(0).max(100),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  url: optionalText(500),
  notes: optionalText(1000),
});

export async function createCourseAction(input: z.input<typeof courseSchema>) {
  const dbUser = await requireDbUser();
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startedAt, completedAt, ...rest } = parsed.data;
  const course = await prisma.course.create({
    data: {
      userId: dbUser.id,
      ...rest,
      startedAt: startedAt ? new Date(startedAt) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
    },
  });
  revalidateLearning();
  return { course };
}

const courseUpdateSchema = courseSchema.partial();

export async function updateCourseAction(courseId: string, input: z.input<typeof courseUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = courseUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startedAt, completedAt, ...rest } = parsed.data;
  await prisma.course.updateMany({
    where: { id: courseId, userId: dbUser.id },
    data: {
      ...rest,
      ...(startedAt !== undefined ? { startedAt: startedAt ? new Date(startedAt) : null } : {}),
      ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
    },
  });
  revalidateLearning();
  return { success: true };
}

export async function deleteCourseAction(courseId: string) {
  const dbUser = await requireDbUser();
  await prisma.course.deleteMany({ where: { id: courseId, userId: dbUser.id } });
  revalidateLearning();
}

// ---------- Books ----------

const bookSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  author: optionalText(120),
  status: z.nativeEnum(BookStatus),
  currentPage: z.coerce.number().int().min(0).max(20000).nullable().optional(),
  totalPages: z.coerce.number().int().min(1).max(20000).nullable().optional(),
  rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  notes: optionalText(1000),
});

export async function createBookAction(input: z.input<typeof bookSchema>) {
  const dbUser = await requireDbUser();
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startedAt, finishedAt, ...rest } = parsed.data;
  const book = await prisma.book.create({
    data: {
      userId: dbUser.id,
      ...rest,
      startedAt: startedAt ? new Date(startedAt) : null,
      finishedAt: finishedAt ? new Date(finishedAt) : null,
    },
  });
  revalidateLearning();
  return { book };
}

const bookUpdateSchema = bookSchema.partial();

export async function updateBookAction(bookId: string, input: z.input<typeof bookUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = bookUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startedAt, finishedAt, ...rest } = parsed.data;
  await prisma.book.updateMany({
    where: { id: bookId, userId: dbUser.id },
    data: {
      ...rest,
      ...(startedAt !== undefined ? { startedAt: startedAt ? new Date(startedAt) : null } : {}),
      ...(finishedAt !== undefined ? { finishedAt: finishedAt ? new Date(finishedAt) : null } : {}),
    },
  });
  revalidateLearning();
  return { success: true };
}

export async function deleteBookAction(bookId: string) {
  const dbUser = await requireDbUser();
  await prisma.book.deleteMany({ where: { id: bookId, userId: dbUser.id } });
  revalidateLearning();
}

// ---------- Certificates ----------

const certificateSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  issuer: optionalText(120),
  issueDate: z.string().min(1, "Issue date is required."),
  expiryDate: z.string().nullable().optional(),
  credentialUrl: optionalText(500),
  notes: optionalText(1000),
});

export async function createCertificateAction(input: z.input<typeof certificateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = certificateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { issueDate, expiryDate, ...rest } = parsed.data;
  const certificate = await prisma.certificate.create({
    data: {
      userId: dbUser.id,
      ...rest,
      issueDate: new Date(issueDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });
  revalidateLearning();
  return { certificate };
}

const certificateUpdateSchema = certificateSchema.partial();

export async function updateCertificateAction(certificateId: string, input: z.input<typeof certificateUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = certificateUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { issueDate, expiryDate, ...rest } = parsed.data;
  await prisma.certificate.updateMany({
    where: { id: certificateId, userId: dbUser.id },
    data: {
      ...rest,
      ...(issueDate !== undefined ? { issueDate: new Date(issueDate) } : {}),
      ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
    },
  });
  revalidateLearning();
  return { success: true };
}

export async function deleteCertificateAction(certificateId: string) {
  const dbUser = await requireDbUser();
  await prisma.certificate.deleteMany({ where: { id: certificateId, userId: dbUser.id } });
  revalidateLearning();
}

// ---------- Reports ----------

export async function generateLearningReportAction(period: ReportPeriod, periodStart: string) {
  const dbUser = await requireDbUser();
  const summary = await generateLearningReport(dbUser.id, period, new Date(periodStart));
  revalidateLearning("/learning/reports");
  return summary;
}
