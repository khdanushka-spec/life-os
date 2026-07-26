"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { generateWorkReport } from "@/lib/ai/work";
import type { ReportPeriod } from "@/generated/prisma/client";

function revalidateWork(subpath?: string) {
  revalidatePath("/work");
  revalidatePath("/work/clients");
  revalidatePath("/work/meetings");
  revalidatePath("/work/documents");
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

// ---------- Clients ----------

const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  company: optionalText(120),
  email: z.string().trim().email("Invalid email.").max(200).nullable().optional().or(z.literal("").transform(() => null)),
  phone: optionalText(40),
  notes: optionalText(2000),
});

export async function createClientAction(input: z.input<typeof clientSchema>) {
  const dbUser = await requireDbUser();
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const client = await prisma.client.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateWork();
  return { client };
}

const clientUpdateSchema = clientSchema.partial();

export async function updateClientAction(clientId: string, input: z.input<typeof clientUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = clientUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.client.updateMany({ where: { id: clientId, userId: dbUser.id }, data: parsed.data });
  revalidateWork(`/work/clients/${clientId}`);
  return { success: true };
}

export async function setClientArchivedAction(clientId: string, archived: boolean) {
  const dbUser = await requireDbUser();
  await prisma.client.updateMany({ where: { id: clientId, userId: dbUser.id }, data: { archived } });
  revalidateWork();
}

export async function deleteClientAction(clientId: string) {
  const dbUser = await requireDbUser();
  // Projects/meetings/documents keep existing (clientId -> SetNull).
  await prisma.client.deleteMany({ where: { id: clientId, userId: dbUser.id } });
  revalidateWork();
}

// ---------- Meetings ----------

const meetingSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  projectId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  startTime: z.string().min(1, "Date/time is required."),
  durationMinutes: z.coerce.number().int().min(1).max(1440).nullable().optional(),
  location: optionalText(200),
  attendees: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  notes: optionalText(2000),
});

export async function createMeetingAction(input: z.input<typeof meetingSchema>) {
  const dbUser = await requireDbUser();
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startTime, ...rest } = parsed.data;
  const meeting = await prisma.meeting.create({
    data: { userId: dbUser.id, ...rest, startTime: new Date(startTime) },
  });
  revalidateWork();
  return { meeting };
}

const meetingUpdateSchema = meetingSchema.partial();

export async function updateMeetingAction(meetingId: string, input: z.input<typeof meetingUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = meetingUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startTime, ...rest } = parsed.data;
  await prisma.meeting.updateMany({
    where: { id: meetingId, userId: dbUser.id },
    data: { ...rest, ...(startTime !== undefined ? { startTime: new Date(startTime) } : {}) },
  });
  revalidateWork();
  return { success: true };
}

export async function toggleMeetingCompletedAction(meetingId: string, completed: boolean) {
  const dbUser = await requireDbUser();
  await prisma.meeting.updateMany({ where: { id: meetingId, userId: dbUser.id }, data: { completed } });
  revalidateWork();
}

export async function deleteMeetingAction(meetingId: string) {
  const dbUser = await requireDbUser();
  await prisma.meeting.deleteMany({ where: { id: meetingId, userId: dbUser.id } });
  revalidateWork();
}

// ---------- Documents ----------

const documentSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: optionalText(2000),
  url: z
    .string()
    .trim()
    .url("Invalid URL.")
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  projectId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export async function createDocumentAction(input: z.input<typeof documentSchema>) {
  const dbUser = await requireDbUser();
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const document = await prisma.workDocument.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateWork();
  return { document };
}

const documentUpdateSchema = documentSchema.partial();

export async function updateDocumentAction(documentId: string, input: z.input<typeof documentUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = documentUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.workDocument.updateMany({ where: { id: documentId, userId: dbUser.id }, data: parsed.data });
  revalidateWork();
  return { success: true };
}

export async function deleteDocumentAction(documentId: string) {
  const dbUser = await requireDbUser();
  await prisma.workDocument.deleteMany({ where: { id: documentId, userId: dbUser.id } });
  revalidateWork();
}

// ---------- Reports ----------

export async function generateWorkReportAction(period: ReportPeriod, periodStart: string) {
  const dbUser = await requireDbUser();
  const summary = await generateWorkReport(dbUser.id, period, new Date(periodStart));
  revalidateWork("/work/reports");
  return summary;
}
