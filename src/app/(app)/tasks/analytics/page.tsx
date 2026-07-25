import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskHeatmap } from "@/components/tasks/task-heatmap";
import { TaskReportCard } from "@/components/tasks/task-report";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { computeStreak } from "@/lib/habits";
import { longestStreak } from "@/lib/journal";
import { completionsByDay } from "@/lib/tasks";
import { startOfWeek, startOfMonth, startOfDay } from "@/lib/date";
import type { ReportPeriod } from "@/generated/prisma/client";

export default async function TaskAnalyticsPage() {
  const dbUser = await requireDbUser();
  const now = new Date();

  const [allTasks, completedTasks] = await Promise.all([
    prisma.task.findMany({ where: { userId: dbUser.id, parentId: null }, include: { project: true } }),
    prisma.task.findMany({
      where: { userId: dbUser.id, parentId: null, status: "DONE", completedAt: { not: null } },
      include: { project: true },
    }),
  ]);

  const totalTasks = allTasks.length;
  const completionRate = totalTasks > 0 ? completedTasks.length / totalTasks : 0;

  const completionDurationsMs = completedTasks
    .filter((t) => t.completedAt)
    .map((t) => t.completedAt!.getTime() - t.createdAt.getTime());
  const avgCompletionHours = completionDurationsMs.length
    ? completionDurationsMs.reduce((a, b) => a + b, 0) / completionDurationsMs.length / 3_600_000
    : 0;

  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const weeklyCompleted = completedTasks.filter((t) => t.completedAt! >= weekStart).length;
  const monthlyCompleted = completedTasks.filter((t) => t.completedAt! >= monthStart).length;

  const focusMinutes = allTasks.reduce((sum, t) => sum + (t.actualMinutes ?? 0), 0);
  const deepWorkMinutes = allTasks
    .filter((t) => t.energy === "DEEP_FOCUS")
    .reduce((sum, t) => sum + (t.actualMinutes ?? 0), 0);

  const dateKeys = new Set(completedTasks.map((t) => t.completedAt!.toISOString().slice(0, 10)));
  const streak = computeStreak(dateKeys);
  const longest = longestStreak(dateKeys);

  const byDayMap = completionsByDay(completedTasks.map((t) => t.completedAt!));

  const projectStats = new Map<string, { name: string; color: string; total: number; done: number }>();
  for (const t of allTasks) {
    if (!t.project) continue;
    const entry = projectStats.get(t.project.id) ?? { name: t.project.name, color: t.project.color, total: 0, done: 0 };
    entry.total++;
    if (t.status === "DONE") entry.done++;
    projectStats.set(t.project.id, entry);
  }

  const periods: { period: ReportPeriod; periodStart: Date }[] = [
    { period: "DAY", periodStart: startOfDay(now) },
    { period: "WEEK", periodStart: weekStart },
    { period: "MONTH", periodStart: monthStart },
  ];
  const reports = await Promise.all(
    periods.map(({ period, periodStart }) =>
      prisma.taskReport.findUnique({ where: { userId_period_periodStart: { userId: dbUser.id, period, periodStart } } }),
    ),
  );

  const stats = [
    { label: "Completion Rate", value: `${Math.round(completionRate * 100)}%` },
    { label: "Avg Completion", value: avgCompletionHours > 0 ? `${avgCompletionHours.toFixed(1)}h` : "-" },
    { label: "This Week", value: weeklyCompleted },
    { label: "This Month", value: monthlyCompleted },
    { label: "Focus Time", value: `${Math.round(focusMinutes / 60)}h` },
    { label: "Deep Work", value: `${Math.round(deepWorkMinutes / 60)}h` },
    { label: "Streak", value: `${streak}d` },
    { label: "Longest Streak", value: `${longest}d` },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6">
      <Link href="/tasks" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Tasks
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border p-3">
                <p className="text-xl font-semibold tabular-nums">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Heatmap</CardTitle>
          <CardDescription>Completions over the last 12 weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskHeatmap completionsByDay={byDayMap} />
        </CardContent>
      </Card>

      {projectStats.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Completion</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {[...projectStats.values()].map((p) => (
              <div key={p.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                  <span className="text-muted-foreground">
                    {p.done}/{p.total}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${p.total > 0 ? (p.done / p.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="DAY">
        <TabsList>
          <TabsTrigger value="DAY">Day</TabsTrigger>
          <TabsTrigger value="WEEK">Week</TabsTrigger>
          <TabsTrigger value="MONTH">Month</TabsTrigger>
        </TabsList>
        {periods.map(({ period, periodStart }, i) => (
          <TabsContent key={period} value={period}>
            <TaskReportCard
              period={period}
              periodStart={periodStart.toISOString()}
              initialReport={(reports[i]?.summary as never) ?? null}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
