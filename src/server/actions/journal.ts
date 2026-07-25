"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { Mood, type ReportPeriod } from "@/generated/prisma/client";
import {
  getOrGenerateReflection,
  getOrGenerateInsights,
  generateReport,
  generateDailyPrompts,
} from "@/lib/ai/journal";

const draftSchema = z.object({
  id: z.string().uuid().optional(),
  contentJson: z.unknown(),
  contentText: z.string().max(20000),
  mood: z.nativeEnum(Mood).nullable().optional(),
  energyMorning: z.number().int().min(1).max(10).nullable().optional(),
  energyAfternoon: z.number().int().min(1).max(10).nullable().optional(),
  energyEvening: z.number().int().min(1).max(10).nullable().optional(),
  gratitude: z.array(z.string().trim().max(280)).max(3).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  writingSeconds: z.number().int().min(0).max(24 * 60 * 60).optional(),
});

export type SaveDraftInput = z.infer<typeof draftSchema>;

// Upserts the entry being actively edited: first call (no id) creates the
// row and returns its id so the client keeps saving into the same row on
// subsequent debounced calls.
export async function saveDraftEntryAction(input: SaveDraftInput): Promise<{ id: string } | null> {
  const dbUser = await requireDbUser();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return null;
  const { id, ...data } = parsed.data;

  const payload = {
    contentJson: data.contentJson as object,
    contentText: data.contentText,
    mood: data.mood ?? null,
    energyMorning: data.energyMorning ?? null,
    energyAfternoon: data.energyAfternoon ?? null,
    energyEvening: data.energyEvening ?? null,
    gratitude: data.gratitude ?? [],
    tags: data.tags ?? [],
    writingSeconds: data.writingSeconds,
  };

  let entry;
  if (id) {
    const result = await prisma.journalEntry.updateMany({
      where: { id, userId: dbUser.id },
      data: payload,
    });
    entry = result.count > 0 ? { id } : null;
  }
  if (!entry) {
    entry = await prisma.journalEntry.create({
      data: { userId: dbUser.id, ...payload },
      select: { id: true },
    });
  }

  revalidatePath("/journal");
  return entry;
}

export async function deleteJournalEntryAction(entryId: string) {
  const dbUser = await requireDbUser();

  await prisma.journalEntry.deleteMany({
    where: { id: entryId, userId: dbUser.id },
  });

  revalidatePath("/journal");
}

export async function generateDailyPromptsAction(): Promise<string[] | null> {
  const dbUser = await requireDbUser();
  return generateDailyPrompts(dbUser.id);
}

export async function regenerateInsightsAction(): Promise<string[] | null> {
  const dbUser = await requireDbUser();
  const today = new Date(new Date().toISOString().slice(0, 10));
  await prisma.journalAiCache
    .delete({ where: { userId_date_kind: { userId: dbUser.id, date: today, kind: "insights" } } })
    .catch(() => {});
  const insights = await getOrGenerateInsights(dbUser.id);
  revalidatePath("/journal");
  return insights;
}

export async function regenerateReflectionAction(): Promise<string | null> {
  const dbUser = await requireDbUser();
  const today = new Date(new Date().toISOString().slice(0, 10));
  await prisma.journalAiCache
    .delete({ where: { userId_date_kind: { userId: dbUser.id, date: today, kind: "reflection" } } })
    .catch(() => {});
  const reflection = await getOrGenerateReflection(dbUser.id);
  revalidatePath("/journal");
  return reflection;
}

export async function generateReportAction(period: ReportPeriod, periodStart: string) {
  const dbUser = await requireDbUser();
  const summary = await generateReport(dbUser.id, period, new Date(periodStart));
  revalidatePath("/journal");
  return summary;
}
