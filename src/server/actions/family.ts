"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { generateFamilyReport } from "@/lib/ai/family";
import { FamilyEventType, GiftIdeaStatus, type ReportPeriod } from "@/generated/prisma/client";

function revalidateFamily(subpath?: string) {
  revalidatePath("/family");
  revalidatePath("/family/members");
  revalidatePath("/family/events");
  revalidatePath("/family/gifts");
  revalidatePath("/family/documents");
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

const optionalUrl = (max: number) =>
  z
    .string()
    .trim()
    .url("Invalid URL.")
    .max(max)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null));

// ---------- Members ----------

const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  relationship: optionalText(60),
  birthday: z.string().nullable().optional(),
  photoUrl: optionalUrl(2000),
  notes: optionalText(2000),
});

export async function createMemberAction(input: z.input<typeof memberSchema>) {
  const dbUser = await requireDbUser();
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { birthday, ...rest } = parsed.data;
  const member = await prisma.familyMember.create({
    data: { userId: dbUser.id, ...rest, birthday: birthday ? new Date(birthday) : null },
  });
  revalidateFamily();
  return { member };
}

const memberUpdateSchema = memberSchema.partial();

export async function updateMemberAction(memberId: string, input: z.input<typeof memberUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = memberUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { birthday, ...rest } = parsed.data;
  await prisma.familyMember.updateMany({
    where: { id: memberId, userId: dbUser.id },
    data: { ...rest, ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}) },
  });
  revalidateFamily();
  return { success: true };
}

export async function setMemberArchivedAction(memberId: string, archived: boolean) {
  const dbUser = await requireDbUser();
  await prisma.familyMember.updateMany({ where: { id: memberId, userId: dbUser.id }, data: { archived } });
  revalidateFamily();
}

export async function deleteMemberAction(memberId: string) {
  const dbUser = await requireDbUser();
  // Events/documents keep existing (memberId -> SetNull); gift ideas
  // cascade-delete since a gift idea makes no sense without its person.
  await prisma.familyMember.deleteMany({ where: { id: memberId, userId: dbUser.id } });
  revalidateFamily();
}

// ---------- Events ----------

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  type: z.nativeEnum(FamilyEventType),
  date: z.string().min(1, "Date is required."),
  memberId: z.string().uuid().nullable().optional(),
  location: optionalText(200),
  notes: optionalText(2000),
});

export async function createEventAction(input: z.input<typeof eventSchema>) {
  const dbUser = await requireDbUser();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { date, ...rest } = parsed.data;
  const event = await prisma.familyEvent.create({
    data: { userId: dbUser.id, ...rest, date: new Date(date) },
  });
  revalidateFamily();
  return { event };
}

const eventUpdateSchema = eventSchema.partial();

export async function updateEventAction(eventId: string, input: z.input<typeof eventUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = eventUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { date, ...rest } = parsed.data;
  await prisma.familyEvent.updateMany({
    where: { id: eventId, userId: dbUser.id },
    data: { ...rest, ...(date !== undefined ? { date: new Date(date) } : {}) },
  });
  revalidateFamily();
  return { success: true };
}

export async function deleteEventAction(eventId: string) {
  const dbUser = await requireDbUser();
  await prisma.familyEvent.deleteMany({ where: { id: eventId, userId: dbUser.id } });
  revalidateFamily();
}

// ---------- Gift ideas ----------

const giftIdeaSchema = z.object({
  memberId: z.string().uuid("A family member is required."),
  title: z.string().trim().min(1, "Title is required.").max(200),
  occasion: optionalText(120),
  price: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  url: optionalUrl(2000),
  status: z.nativeEnum(GiftIdeaStatus),
  notes: optionalText(1000),
});

export async function createGiftIdeaAction(input: z.input<typeof giftIdeaSchema>) {
  const dbUser = await requireDbUser();
  const parsed = giftIdeaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const giftIdea = await prisma.giftIdea.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateFamily();
  return { giftIdea };
}

const giftIdeaUpdateSchema = giftIdeaSchema.partial();

export async function updateGiftIdeaAction(giftIdeaId: string, input: z.input<typeof giftIdeaUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = giftIdeaUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.giftIdea.updateMany({ where: { id: giftIdeaId, userId: dbUser.id }, data: parsed.data });
  revalidateFamily();
  return { success: true };
}

export async function deleteGiftIdeaAction(giftIdeaId: string) {
  const dbUser = await requireDbUser();
  await prisma.giftIdea.deleteMany({ where: { id: giftIdeaId, userId: dbUser.id } });
  revalidateFamily();
}

// ---------- Documents ----------

const documentSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: optionalText(2000),
  url: optionalUrl(2000),
  memberId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export async function createDocumentAction(input: z.input<typeof documentSchema>) {
  const dbUser = await requireDbUser();
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const document = await prisma.familyDocument.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateFamily();
  return { document };
}

const documentUpdateSchema = documentSchema.partial();

export async function updateDocumentAction(documentId: string, input: z.input<typeof documentUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = documentUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.familyDocument.updateMany({ where: { id: documentId, userId: dbUser.id }, data: parsed.data });
  revalidateFamily();
  return { success: true };
}

export async function deleteDocumentAction(documentId: string) {
  const dbUser = await requireDbUser();
  await prisma.familyDocument.deleteMany({ where: { id: documentId, userId: dbUser.id } });
  revalidateFamily();
}

// ---------- Reports ----------

export async function generateFamilyReportAction(period: ReportPeriod, periodStart: string) {
  const dbUser = await requireDbUser();
  const summary = await generateFamilyReport(dbUser.id, period, new Date(periodStart));
  revalidateFamily("/family/reports");
  return summary;
}
