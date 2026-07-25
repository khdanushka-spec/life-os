import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { resolveAiModel } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { moodMeta, journalReportSchema, type JournalReportSummary } from "@/lib/journal";
import type { JournalEntry, ReportPeriod } from "@/generated/prisma/client";

const insightsSchema = z.object({ insights: z.array(z.string()).max(5) });

const SYSTEM =
  "You are the reflective voice inside AURA OS's Journal - warm, concise, honest. " +
  "Never invent details, patterns, or trends that aren't actually supported by the data you're given. " +
  "If there isn't enough data for a claim, say so plainly instead of guessing.";

function entryLines(entries: JournalEntry[]): string {
  if (entries.length === 0) return "No journal entries in this period.";
  return entries
    .map((e) => {
      const mood = moodMeta(e.mood);
      const preview =
        e.contentText.length > 300 ? `${e.contentText.slice(0, 300)}...` : e.contentText;
      const tags = e.tags.length ? ` [tags: ${e.tags.join(", ")}]` : "";
      return `- ${e.createdAt.toDateString()}${mood ? ` (${mood.label.toLowerCase()})` : ""}${tags}: ${preview || "(no text)"}`;
    })
    .join("\n");
}

function todayDate(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

async function readCache(userId: string, kind: string): Promise<unknown | null> {
  const cached = await prisma.journalAiCache.findUnique({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
  });
  return cached?.content ?? null;
}

async function writeCache(userId: string, kind: string, content: unknown) {
  await prisma.journalAiCache.upsert({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
    update: { content: content as object },
    create: { userId, date: todayDate(), kind, content: content as object },
  });
}

export async function getOrGenerateReflection(userId: string): Promise<string | null> {
  const cached = (await readCache(userId, "reflection")) as { text: string } | null;
  if (cached) return cached.text;

  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  if (entries.length === 0) return null;

  // Runs unconditionally on every /journal page load - a bare AI-call
  // failure here must not crash the whole page, so this fails soft to null
  // like every other AI feature in the app.
  try {
    const { text } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Here are the user's most recent journal entries:\n${entryLines(entries)}\n\nWrite one warm, specific, 1-2 sentence reflection on how they've been doing lately. No greeting, no generic advice - just an honest, grounded observation based on what they actually wrote.`,
    });
    await writeCache(userId, "reflection", { text });
    return text;
  } catch {
    return null;
  }
}

export async function getOrGenerateInsights(userId: string): Promise<string[] | null> {
  const cached = (await readCache(userId, "insights")) as { insights: string[] } | null;
  if (cached) return cached.insights;

  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const entries = await prisma.journalEntry.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  if (entries.length < 3) return null;

  const habits = await prisma.habit.findMany({
    where: { userId, archived: false },
    include: { logs: { where: { date: { gte: since } } } },
  });
  const habitSummary = habits.length
    ? habits.map((h) => `- ${h.title}: completed ${h.logs.length} of the last 30 days`).join("\n")
    : "No habits tracked.";

  // Same page-load crash risk as getOrGenerateReflection above.
  try {
    const { output } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Journal entries from the last 30 days:\n${entryLines(entries)}\n\nHabit completion over the same period:\n${habitSummary}\n\nSurface up to 5 short, honest observations about patterns in mood, energy, habits, or recurring themes - things like "you've mentioned X three days in a row" or "your best days follow Y". Only state a pattern that's actually supported by the data above. If there isn't a real pattern yet, return fewer insights, or one gentle encouragement to keep journaling - never fabricate a trend.`,
      output: Output.object({ schema: insightsSchema }),
    });

    const { insights } = insightsSchema.parse(output);
    if (insights.length === 0) return null;

    await writeCache(userId, "insights", { insights });
    return insights;
  } catch {
    return null;
  }
}

export async function generateReport(
  userId: string,
  period: ReportPeriod,
  periodStart: Date,
): Promise<JournalReportSummary | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const periodEnd = new Date(periodStart);
  if (period === "WEEK") periodEnd.setDate(periodEnd.getDate() + 7);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const entries = await prisma.journalEntry.findMany({
    where: { userId, createdAt: { gte: periodStart, lt: periodEnd } },
    orderBy: { createdAt: "asc" },
  });

  const habits = await prisma.habit.findMany({
    where: { userId, archived: false },
    include: { logs: { where: { date: { gte: periodStart, lt: periodEnd } } } },
  });
  const habitSummary = habits.length
    ? habits.map((h) => `- ${h.title}: ${h.logs.length} days completed`).join("\n")
    : "No habits tracked.";

  const label = period === "WEEK" ? "week" : "month";
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here is the user's journal for this ${label} (${periodStart.toDateString()} - ${periodEnd.toDateString()}):\n${entryLines(entries)}\n\nHabit completion this ${label}:\n${habitSummary}\n\nWrite a grounded ${label}ly reflection based only on what's above. If there are too few entries to say something real, keep the lists short and say so in the relevant field rather than inventing content.`,
    output: Output.object({ schema: journalReportSchema }),
  });

  const summary = journalReportSchema.parse(output);

  await prisma.journalReport.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    update: { summary },
    create: { userId, period, periodStart, summary },
  });

  return summary;
}

export async function generateDailyPrompts(userId: string): Promise<string[] | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const { text } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `${entries.length ? `Recent journal entries:\n${entryLines(entries)}\n\n` : ""}Write 4 short, specific, reflective journal prompts for today - one per line, no numbering, no quotes. Personalize them to the recent entries if any are given, otherwise use warm, general reflective prompts.`,
  });

  const prompts = text
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);
  return prompts.length ? prompts : null;
}
