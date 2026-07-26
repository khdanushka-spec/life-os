import "server-only";
import { generateText, Output } from "ai";
import { resolveAiModel } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { learningReportNarrativeSchema, type LearningReportSummary } from "@/lib/learning";
import { brisbaneToday } from "@/lib/date";
import type { ReportPeriod } from "@/generated/prisma/client";

const SYSTEM =
  "You are the learning-and-growth voice inside AURA OS - direct, concise, encouraging, never preachy. " +
  "You only ever see the user's real logged data below - never invent a course, book, skill, or number " +
  "that isn't explicitly given to you.";

const todayDate = brisbaneToday;

async function readCache(userId: string, kind: string): Promise<unknown | null> {
  const cached = await prisma.learningAiCache.findUnique({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
  });
  return cached?.content ?? null;
}

async function writeCache(userId: string, kind: string, content: unknown) {
  await prisma.learningAiCache.upsert({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
    update: { content: content as object },
    create: { userId, date: todayDate(), kind, content: content as object },
  });
}

export async function getOrGenerateDailyInsight(userId: string): Promise<string | null> {
  const cached = (await readCache(userId, "insight")) as { text: string } | null;
  if (cached) return cached.text;

  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [recentLogs, activeCourses, activeBooks] = await Promise.all([
    prisma.studyLog.findMany({ where: { userId, date: { gte: weekAgo } }, orderBy: { date: "asc" } }),
    prisma.course.findMany({ where: { userId, status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.book.findMany({ where: { userId, status: "READING" }, orderBy: { updatedAt: "desc" }, take: 10 }),
  ]);

  if (recentLogs.length === 0 && activeCourses.length === 0 && activeBooks.length === 0) return null;

  const logLines = recentLogs.map((l) => {
    const bits = [
      l.minutesStudied != null ? `${l.minutesStudied} min studied` : null,
      l.focusScore != null ? `focus ${l.focusScore}/5` : null,
    ].filter(Boolean);
    return bits.length ? `- ${l.date.toDateString()}: ${bits.join(", ")}` : null;
  }).filter(Boolean);
  const courseLines = activeCourses.map((c) => `- "${c.title}" - ${c.progressPercent}% complete`);
  const bookLines = activeBooks.map((b) => {
    const progress = b.currentPage != null && b.totalPages != null ? ` (page ${b.currentPage}/${b.totalPages})` : "";
    return `- "${b.title}"${b.author ? ` by ${b.author}` : ""}${progress}`;
  });

  try {
    const { text } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Here is the user's learning data from the last 7 days:\n\nStudy check-ins:\n${logLines.join("\n") || "none logged"}\n\nCourses in progress:\n${courseLines.join("\n") || "none"}\n\nBooks currently reading:\n${bookLines.join("\n") || "none"}\n\nIn 1-2 sentences, give one practical, grounded piece of guidance for today - like a course worth picking back up or a reading streak worth continuing. Base it only on the data listed.`,
    });
    await writeCache(userId, "insight", { text });
    return text;
  } catch {
    return null;
  }
}

export async function generateLearningReport(
  userId: string,
  period: ReportPeriod,
  periodStart: Date,
): Promise<LearningReportSummary | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const periodEnd = new Date(periodStart);
  if (period === "DAY") periodEnd.setDate(periodEnd.getDate() + 1);
  else if (period === "WEEK") periodEnd.setDate(periodEnd.getDate() + 7);
  else if (period === "MONTH") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const [logs, coursesCompleted, booksFinished] = await Promise.all([
    prisma.studyLog.findMany({
      where: { userId, date: { gte: periodStart, lt: periodEnd } },
      orderBy: { date: "asc" },
    }),
    prisma.course.count({ where: { userId, status: "COMPLETED", completedAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.book.count({ where: { userId, status: "FINISHED", finishedAt: { gte: periodStart, lt: periodEnd } } }),
  ]);

  const totalMinutesStudied = logs.reduce((sum, l) => sum + (l.minutesStudied ?? 0), 0);
  const focusValues = logs.map((l) => l.focusScore).filter((v): v is number => v != null);
  const avgFocusScore = focusValues.length ? focusValues.reduce((s, v) => s + v, 0) / focusValues.length : null;

  const label = period.toLowerCase();
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here are the computed stats for this ${label} (${periodStart.toDateString()} - ${periodEnd.toDateString()}):
Total minutes studied: ${totalMinutesStudied}
Courses completed: ${coursesCompleted}
Books finished: ${booksFinished}
Average focus score: ${avgFocusScore != null ? `${avgFocusScore.toFixed(1)}/5` : "not logged"}

Write a grounded ${label}ly overview, up to 5 wins, up to 5 challenges, and up to 5 suggestions - based only on the numbers above.`,
    output: Output.object({ schema: learningReportNarrativeSchema }),
  });

  const narrative = learningReportNarrativeSchema.parse(output);
  const summary: LearningReportSummary = {
    totalMinutesStudied,
    coursesCompleted,
    booksFinished,
    avgFocusScore,
    ...narrative,
  };

  await prisma.learningReport.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    update: { summary },
    create: { userId, period, periodStart, summary },
  });

  return summary;
}
