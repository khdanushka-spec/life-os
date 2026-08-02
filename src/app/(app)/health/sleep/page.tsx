import Link from "next/link";
import { ArrowLeft, Moon, Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { SleepTrendChart } from "@/components/health/sleep-trend-chart";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { SLEEP_GOAL_HOURS } from "@/lib/health";

export default async function SleepDetailPage() {
  const dbUser = await requireDbUser();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const logs = await prisma.dailyHealthLog.findMany({
    where: { userId: dbUser.id, date: { gte: thirtyDaysAgo }, sleepHours: { not: null } },
    orderBy: { date: "asc" },
  });

  const entries = logs.map((l) => ({ date: l.date.toISOString().slice(0, 10), sleepHours: Number(l.sleepHours) }));
  const averageHours = entries.length ? Math.round((entries.reduce((s, e) => s + e.sleepHours, 0) / entries.length) * 10) / 10 : 0;

  const qualityLogs = logs.filter((l) => l.sleepQuality != null);
  const averageQuality = qualityLogs.length
    ? Math.round((qualityLogs.reduce((s, l) => s + l.sleepQuality!, 0) / qualityLogs.length) * 10) / 10
    : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/health" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Health
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sleep</h1>
        <p className="text-sm text-muted-foreground">Goal: {SLEEP_GOAL_HOURS}h/night, last 30 days.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Moon} label="Average sleep" value={averageHours} suffix="h" accent="bg-indigo-500" />
        <StatCard icon={Star} label="Average quality" value={averageQuality ?? "–"} suffix={averageQuality != null ? "/5" : ""} accent="bg-indigo-500" />
      </div>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Sleep hours (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <SleepTrendChart entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
