import "server-only";
import { generateText, Output } from "ai";
import { resolveAiModel } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { healthReportNarrativeSchema, type HealthReportSummary } from "@/lib/health";
import { brisbaneToday } from "@/lib/date";
import type { ReportPeriod } from "@/generated/prisma/client";

const SYSTEM =
  "You are the health-and-wellbeing voice inside AURA OS - direct, concise, warm, never clinical or " +
  "alarmist. You only ever see the user's real logged data below - never invent a symptom, diagnosis, " +
  "or number that isn't explicitly given to you, and never give medical advice, only observations about " +
  "their own logged patterns.";

const todayDate = brisbaneToday;

async function readCache(userId: string, kind: string): Promise<unknown | null> {
  const cached = await prisma.healthAiCache.findUnique({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
  });
  return cached?.content ?? null;
}

async function writeCache(userId: string, kind: string, content: unknown) {
  await prisma.healthAiCache.upsert({
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
  const twoWeeksAhead = new Date(now.getTime() + 14 * 86_400_000);

  const [recentLogs, recentWorkouts, upcomingFollowUps] = await Promise.all([
    prisma.dailyHealthLog.findMany({ where: { userId, date: { gte: weekAgo } }, orderBy: { date: "asc" } }),
    prisma.workout.findMany({ where: { userId, performedAt: { gte: weekAgo } }, orderBy: { performedAt: "asc" } }),
    prisma.medicalRecord.findMany({
      where: { userId, followUpDate: { gte: now, lt: twoWeeksAhead } },
      orderBy: { followUpDate: "asc" },
    }),
  ]);

  if (recentLogs.length === 0 && recentWorkouts.length === 0 && upcomingFollowUps.length === 0) return null;

  const logLines = recentLogs.map((l) => {
    const bits = [
      l.waterMl != null ? `water ${l.waterMl}ml` : null,
      l.sleepHours != null ? `slept ${l.sleepHours}h` : null,
      l.wellbeingScore != null ? `wellbeing ${l.wellbeingScore}/10` : null,
    ].filter(Boolean);
    return bits.length ? `- ${l.date.toDateString()}: ${bits.join(", ")}` : null;
  }).filter(Boolean);
  const workoutLines = recentWorkouts.map((w) => `- ${w.type} on ${w.performedAt.toDateString()}`);
  const followUpLines = upcomingFollowUps.map((f) => `- ${f.title} due ${f.followUpDate!.toDateString()}`);

  try {
    const { text } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Here is the user's health data from the last 7 days:\n\nDaily check-ins:\n${logLines.join("\n") || "none logged"}\n\nWorkouts:\n${workoutLines.join("\n") || "none logged"}\n\nUpcoming medical follow-ups (next 14 days):\n${followUpLines.join("\n") || "none"}\n\nIn 1-2 sentences, give one practical, grounded piece of guidance for today - like a hydration or sleep pattern worth noticing, or a follow-up to prepare for. Base it only on the data listed.`,
    });
    await writeCache(userId, "insight", { text });
    return text;
  } catch {
    return null;
  }
}

export async function generateHealthReport(
  userId: string,
  period: ReportPeriod,
  periodStart: Date,
): Promise<HealthReportSummary | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const periodEnd = new Date(periodStart);
  if (period === "DAY") periodEnd.setDate(periodEnd.getDate() + 1);
  else if (period === "WEEK") periodEnd.setDate(periodEnd.getDate() + 7);
  else if (period === "MONTH") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const [logs, workouts] = await Promise.all([
    prisma.dailyHealthLog.findMany({
      where: { userId, date: { gte: periodStart, lt: periodEnd } },
      orderBy: { date: "asc" },
    }),
    prisma.workout.findMany({ where: { userId, performedAt: { gte: periodStart, lt: periodEnd } } }),
  ]);

  const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);
  const sleepValues = logs.map((l) => l.sleepHours).filter((v): v is NonNullable<typeof v> => v != null).map(Number);
  const waterValues = logs.map((l) => l.waterMl).filter((v): v is number => v != null);
  const wellbeingValues = logs.map((l) => l.wellbeingScore).filter((v): v is number => v != null);
  const weightEntries = logs.filter((l) => l.weightKg != null).map((l) => Number(l.weightKg));

  const avgSleepHours = avg(sleepValues);
  const avgWaterMl = avg(waterValues);
  const avgWellbeingScore = avg(wellbeingValues);
  const weightChangeKg = weightEntries.length >= 2 ? weightEntries[weightEntries.length - 1] - weightEntries[0] : null;
  const totalCaloriesBurned = workouts.reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0);

  const label = period.toLowerCase();
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here are the computed stats for this ${label} (${periodStart.toDateString()} - ${periodEnd.toDateString()}):
Average sleep: ${avgSleepHours != null ? `${avgSleepHours.toFixed(1)}h` : "not logged"}
Average water intake: ${avgWaterMl != null ? `${Math.round(avgWaterMl)}ml` : "not logged"}
Average wellbeing score: ${avgWellbeingScore != null ? `${avgWellbeingScore.toFixed(1)}/10` : "not logged"}
Workouts logged: ${workouts.length}
Total calories burned (from logged workouts): ${totalCaloriesBurned}
Weight change: ${weightChangeKg != null ? `${weightChangeKg > 0 ? "+" : ""}${weightChangeKg.toFixed(1)}kg` : "not enough data"}

Write a grounded ${label}ly overview, up to 5 wins, up to 5 challenges, and up to 5 suggestions - based only on the numbers above. Never give medical advice, only observations about their own logged patterns.`,
    output: Output.object({ schema: healthReportNarrativeSchema }),
  });

  const narrative = healthReportNarrativeSchema.parse(output);
  const summary: HealthReportSummary = {
    avgSleepHours,
    avgWaterMl,
    avgWellbeingScore,
    workoutsLogged: workouts.length,
    totalCaloriesBurned,
    weightChangeKg,
    ...narrative,
  };

  await prisma.healthReport.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    update: { summary },
    create: { userId, period, periodStart, summary },
  });

  return summary;
}
