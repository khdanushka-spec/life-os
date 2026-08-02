import Link from "next/link";
import { ArrowLeft, Droplet, CalendarCheck, Flame } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { HydrationTrendChart } from "@/components/health/hydration-trend-chart";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { WATER_GOAL_ML } from "@/lib/health";

export default async function HydrationDetailPage() {
  const dbUser = await requireDbUser();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const logs = await prisma.dailyHealthLog.findMany({
    where: { userId: dbUser.id, date: { gte: thirtyDaysAgo }, waterMl: { not: null } },
    orderBy: { date: "asc" },
  });

  const entries = logs.map((l) => ({ date: l.date.toISOString().slice(0, 10), waterMl: l.waterMl! }));
  const average = entries.length ? Math.round(entries.reduce((s, e) => s + e.waterMl, 0) / entries.length) : 0;
  const daysGoalMet = entries.filter((e) => e.waterMl >= WATER_GOAL_ML).length;

  // Current streak: consecutive most-recent logged days meeting the goal.
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].waterMl >= WATER_GOAL_ML) streak++;
    else break;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/health" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Health
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hydration</h1>
        <p className="text-sm text-muted-foreground">Goal: {WATER_GOAL_ML}ml/day, last 30 days.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Droplet} label="Average" value={average} suffix="ml" accent="bg-sky-500" />
        <StatCard icon={CalendarCheck} label="Days goal met" value={daysGoalMet} accent="bg-sky-500" />
        <StatCard icon={Flame} label="Current streak" value={streak} suffix="d" accent="bg-sky-500" />
      </div>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Water intake (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <HydrationTrendChart entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
