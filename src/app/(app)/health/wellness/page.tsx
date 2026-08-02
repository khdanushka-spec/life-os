import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WellnessBreakdownRow } from "@/components/health/wellness-breakdown-row";
import { WellnessTrendChart } from "@/components/health/wellness-trend-chart";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { brisbaneDateKey } from "@/lib/date";
import { computeWellnessBreakdown } from "@/lib/health";

export default async function WellnessDetailPage() {
  const dbUser = await requireDbUser();
  const now = new Date();
  const todayKey = brisbaneDateKey(now);
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  // Workouts are fetched with an extra 7-day buffer so the trailing
  // "workouts this week" count is accurate even for the oldest charted day.
  const bufferedStart = new Date(now.getTime() - 37 * 86_400_000);

  const [todayLog, recentLogs, workouts] = await Promise.all([
    prisma.dailyHealthLog.findUnique({ where: { userId_date: { userId: dbUser.id, date: today } } }),
    prisma.dailyHealthLog.findMany({ where: { userId: dbUser.id, date: { gte: thirtyDaysAgo } }, orderBy: { date: "asc" } }),
    prisma.workout.findMany({ where: { userId: dbUser.id, performedAt: { gte: bufferedStart } }, select: { performedAt: true } }),
  ]);

  const workoutsInWindow = (windowStart: Date, windowEndExclusive: Date) =>
    workouts.filter((w) => w.performedAt >= windowStart && w.performedAt < windowEndExclusive).length;

  const todayBreakdown = computeWellnessBreakdown({
    waterMl: todayLog?.waterMl ?? null,
    sleepHours: todayLog?.sleepHours ? Number(todayLog.sleepHours) : null,
    wellbeingScore: todayLog?.wellbeingScore ?? null,
    workoutsThisWeek: workoutsInWindow(new Date(now.getTime() - 7 * 86_400_000), new Date(now.getTime() + 1)),
  });

  const trend = recentLogs.map((log) => {
    const dayStart = log.date;
    const weekStart = new Date(dayStart.getTime() - 6 * 86_400_000);
    const dayEndExclusive = new Date(dayStart.getTime() + 86_400_000);
    const { total } = computeWellnessBreakdown({
      waterMl: log.waterMl,
      sleepHours: log.sleepHours ? Number(log.sleepHours) : null,
      wellbeingScore: log.wellbeingScore,
      workoutsThisWeek: workoutsInWindow(weekStart, dayEndExclusive),
    });
    return { date: log.date.toISOString().slice(0, 10), score: total };
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/health" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Health
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wellness Score</h1>
        <p className="text-sm text-muted-foreground">Today&apos;s score is {todayBreakdown.total}%, blended from four weighted parts.</p>
      </div>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WellnessBreakdownRow label="Hydration" weightPercent={25} percent={todayBreakdown.hydrationScore} />
          <WellnessBreakdownRow label="Sleep" weightPercent={30} percent={todayBreakdown.sleepScore} />
          <WellnessBreakdownRow label="Wellbeing" weightPercent={25} percent={todayBreakdown.wellbeingPercent} />
          <WellnessBreakdownRow label="Exercise" weightPercent={20} percent={todayBreakdown.exerciseScore} />
          <p className="text-xs text-muted-foreground">
            A metric not logged yet today counts as a neutral 50% rather than 0%, so a missing check-in doesn&apos;t tank the score the
            way a genuinely low value would.
          </p>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Trend (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <WellnessTrendChart entries={trend} />
        </CardContent>
      </Card>
    </div>
  );
}
