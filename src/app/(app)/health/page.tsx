import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brisbaneDateKey } from "@/lib/date";
import { computeWellnessScore, hydrationPercent } from "@/lib/health";
import { getOrGenerateDailyInsight } from "@/lib/ai/health";
import { HealthStatsRow } from "@/components/health/health-stats-row";
import { DailyCheckInCard } from "@/components/health/daily-checkin-card";
import { WeightTrendChart } from "@/components/health/weight-trend-chart";
import { RecentWorkouts } from "@/components/health/recent-workouts";
import { UpcomingFollowUps } from "@/components/health/upcoming-followups";
import { HealthInsightCard } from "@/components/health/health-insight-card";

const SUB_PAGES = [
  { href: "/health/workouts", label: "Workouts" },
  { href: "/health/nutrition", label: "Nutrition" },
  { href: "/health/medical", label: "Medical Records" },
  { href: "/health/reports", label: "Reports" },
];

export default async function HealthPage() {
  const dbUser = await requireDbUser();

  const todayKey = brisbaneDateKey();
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const twoWeeksAhead = new Date(now.getTime() + 14 * 86_400_000);

  const [todayLog, recentLogs, weightLogs, workoutsThisWeek, recentWorkouts, upcomingFollowUps, dailyInsight] =
    await Promise.all([
      prisma.dailyHealthLog.findUnique({ where: { userId_date: { userId: dbUser.id, date: today } } }),
      prisma.dailyHealthLog.findMany({ where: { userId: dbUser.id, date: { gte: weekAgo } }, orderBy: { date: "desc" } }),
      prisma.dailyHealthLog.findMany({
        where: { userId: dbUser.id, date: { gte: thirtyDaysAgo }, weightKg: { not: null } },
        orderBy: { date: "asc" },
      }),
      prisma.workout.count({ where: { userId: dbUser.id, performedAt: { gte: weekAgo } } }),
      prisma.workout.findMany({ where: { userId: dbUser.id }, orderBy: { performedAt: "desc" }, take: 5 }),
      prisma.medicalRecord.findMany({
        where: { userId: dbUser.id, followUpDate: { gte: now, lt: twoWeeksAhead } },
        orderBy: { followUpDate: "asc" },
      }),
      getOrGenerateDailyInsight(dbUser.id),
    ]);

  const lastNightLog = recentLogs.find((l) => l.sleepHours != null);

  const wellnessScore = computeWellnessScore({
    waterMl: todayLog?.waterMl ?? null,
    sleepHours: lastNightLog?.sleepHours ? Number(lastNightLog.sleepHours) : null,
    wellbeingScore: todayLog?.wellbeingScore ?? null,
    workoutsThisWeek,
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
        <p className="text-sm text-muted-foreground">Exercise, sleep, water, weight — one daily check-in.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUB_PAGES.map((p) => (
          <Link key={p.href} href={p.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {p.label}
          </Link>
        ))}
      </div>

      <HealthStatsRow
        wellnessScore={wellnessScore}
        hydrationPercent={hydrationPercent(todayLog?.waterMl ?? null)}
        sleepHoursLastNight={lastNightLog?.sleepHours ? Number(lastNightLog.sleepHours) : null}
        workoutsThisWeek={workoutsThisWeek}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <DailyCheckInCard
            log={{
              date: todayKey,
              weightKg: todayLog?.weightKg ? Number(todayLog.weightKg) : null,
              waterMl: todayLog?.waterMl ?? null,
              sleepHours: todayLog?.sleepHours ? Number(todayLog.sleepHours) : null,
              sleepQuality: todayLog?.sleepQuality ?? null,
              wellbeingScore: todayLog?.wellbeingScore ?? null,
              note: todayLog?.note ?? null,
            }}
          />
          <Card className="border-none bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base">Weight Trend (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <WeightTrendChart
                entries={weightLogs.map((l) => ({ date: l.date.toISOString().slice(0, 10), weightKg: Number(l.weightKg) }))}
              />
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <HealthInsightCard insight={dailyInsight} />
          <RecentWorkouts
            workouts={recentWorkouts.map((w) => ({
              id: w.id,
              type: w.type,
              performedAt: w.performedAt,
              durationMinutes: w.durationMinutes,
            }))}
          />
          <UpcomingFollowUps
            followUps={upcomingFollowUps
              .filter((f) => f.followUpDate)
              .map((f) => ({ id: f.id, title: f.title, followUpDate: f.followUpDate! }))}
          />
        </div>
      </div>
    </div>
  );
}
