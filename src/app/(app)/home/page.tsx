import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CircularProgress } from "@/components/circular-progress";
import { Sparkles, Cloud, Clock, CheckCircle2 } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { todayDateKey } from "@/lib/habits";
import { greeting } from "@/lib/greeting";
import { startOfMonth, startOfBrisbaneDay } from "@/lib/date";
import { decToNumber } from "@/lib/finance";
import { computeFocusScore, estimateWorkloadMinutes, buildSmartTimeline, type SmartTimelineBuckets } from "@/lib/tasks";
import { BrisbaneClock } from "@/components/brisbane-clock";
import type { Task } from "@/generated/prisma/client";

const mockFocusItems = [
  { title: "Finish AURA OS Phase 1 auth flow", due: "Today" },
  { title: "Review Q3 budget draft", due: "Tomorrow" },
  { title: "Reply to Sarah re: project timeline", due: "Today" },
];

function formatDue(date: Date) {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const momentum = [
  { label: "Tasks", value: 62 },
  { label: "Health", value: 40 },
  { label: "Learning", value: 25 },
  { label: "Finance", value: 80 },
  { label: "Habits", value: 55 },
];

const suggestions = [
  "You have a free 90-minute focus block this afternoon.",
  "You've skipped exercise for two days — a short walk could help.",
  "You usually review finances on Fridays.",
];

async function getDashboardData(): Promise<{
  name: string;
  tasks: Task[] | null;
  habitsPercent: number | null;
  financePercent: number | null;
  tasksPercent: number | null;
  timeline: SmartTimelineBuckets | null;
}> {
  if (!isSupabaseConfigured()) {
    return { name: "there", tasks: null, habitsPercent: null, financePercent: null, tasksPercent: null, timeline: null };
  }

  const dbUser = await requireDbUser();
  const tasks = await prisma.task.findMany({
    where: { userId: dbUser.id, status: { notIn: ["DONE", "SOMEDAY"] } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 3,
  });

  const now = new Date();
  const todayStart = startOfBrisbaneDay(now);
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);
  const [dueTodayTasks, completedTodayTasks, todaysTasks] = await Promise.all([
    prisma.task.findMany({
      where: { userId: dbUser.id, parentId: null, dueDate: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.task.count({
      where: { userId: dbUser.id, parentId: null, status: "DONE", completedAt: { gte: todayStart } },
    }),
    prisma.task.findMany({
      where: {
        userId: dbUser.id,
        parentId: null,
        archived: false,
        OR: [
          { dueDate: { gte: todayStart, lt: todayEnd } },
          { status: "DONE", completedAt: { gte: todayStart, lt: todayEnd } },
        ],
      },
    }),
  ]);
  const overdueCount = await prisma.task.count({
    where: { userId: dbUser.id, parentId: null, status: { notIn: ["DONE"] }, dueDate: { lt: todayStart } },
  });
  const timeline = buildSmartTimeline(todaysTasks, now);
  const tasksPercent = computeFocusScore({
    dueTodayCount: dueTodayTasks.length,
    completedTodayCount: completedTodayTasks,
    overdueCount,
    estimatedMinutesToday: estimateWorkloadMinutes(dueTodayTasks),
  }).score;

  const habits = await prisma.habit.findMany({
    where: { userId: dbUser.id, archived: false },
    include: { logs: { where: { date: new Date(todayDateKey()) } } },
  });
  const habitsPercent = habits.length
    ? Math.round(
        (habits.filter((h) => h.logs.length > 0).length / habits.length) * 100,
      )
    : null;

  const monthStart = startOfMonth(new Date());
  const budgets = await prisma.budget.findMany({ where: { userId: dbUser.id, month: monthStart } });
  let financePercent: number | null = null;
  if (budgets.length) {
    const spend = await prisma.transaction.findMany({
      where: { userId: dbUser.id, type: "EXPENSE", date: { gte: monthStart } },
    });
    const spendByCategory: Record<string, number> = {};
    for (const t of spend) {
      spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + decToNumber(t.amount);
    }
    const underLimit = budgets.filter((b) => (spendByCategory[b.category] ?? 0) <= decToNumber(b.monthlyLimit)).length;
    financePercent = Math.round((underLimit / budgets.length) * 100);
  }

  const name = dbUser.username ?? dbUser.email?.split("@")[0] ?? "there";
  return { name, tasks, habitsPercent, financePercent, tasksPercent, timeline };
}

const timelineSections = [
  { key: "current", label: "Current" },
  { key: "next", label: "Next" },
  { key: "later", label: "Later" },
  { key: "completed", label: "Completed" },
] as const;

export default async function HomePage() {
  const { name, tasks, habitsPercent, financePercent, tasksPercent, timeline } = await getDashboardData();
  // Brisbane's date, not the server's (Vercel functions run UTC) - keeps
  // "today" in sync with the Smart Timeline's own Brisbane day boundary.
  const today = new Date().toLocaleDateString("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
      {/* Morning Briefing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            {greeting()}, {name}.
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> {today}, <BrisbaneClock />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Cloud className="size-3.5" /> 22°C, partly cloudy
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              You have 3 things that need attention today, and one clear
              90-minute block to make real progress on Phase 1. Nothing else
              is urgent — take it steady.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Focus */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Focus</CardTitle>
            <CardDescription>Top priorities and deadlines</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {tasks === null &&
              mockFocusItems.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <span className="text-sm">{item.title}</span>
                  <Badge variant="secondary">{item.due}</Badge>
                </div>
              ))}
            {tasks?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing urgent — you&apos;re all caught up.
              </p>
            )}
            {tasks?.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <span className="text-sm">{task.title}</span>
                {task.dueDate && (
                  <Badge variant="secondary">{formatDue(task.dueDate)}</Badge>
                )}
              </div>
            ))}
            {tasks !== null && (
              <Link
                href="/tasks"
                className={buttonVariants({
                  variant: "link",
                  className: "h-auto self-start p-0",
                })}
              >
                View all tasks
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Smart Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Smart Timeline</CardTitle>
            <CardDescription>Your day at a glance, Brisbane time</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {timeline === null && (
              <p className="text-sm text-muted-foreground">
                Sign in to see today&apos;s schedule.
              </p>
            )}
            {timeline &&
              Object.values(timeline).every((items) => items.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled for today yet.
                </p>
              )}
            {timeline &&
              timelineSections.map(({ key, label }) => {
                const items = timeline[key];
                if (items.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {key === "completed" ? (
                            <CheckCircle2 className="size-3.5 text-primary" />
                          ) : (
                            <span className="w-10 shrink-0 text-xs text-muted-foreground">
                              {item.time}
                            </span>
                          )}
                          <span
                            className={
                              key === "completed"
                                ? "text-muted-foreground line-through"
                                : ""
                            }
                          >
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Daily Momentum */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Momentum</CardTitle>
          <CardDescription>How today is tracking, area by area</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-around gap-6">
          {momentum.map((m) => {
            let value = m.value;
            if (m.label === "Tasks" && tasksPercent !== null) value = tasksPercent;
            if (m.label === "Habits" && habitsPercent !== null) value = habitsPercent;
            if (m.label === "Finance" && financePercent !== null) value = financePercent;
            return <CircularProgress key={m.label} value={value} label={m.label} />;
          })}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <p
              key={s}
              className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
            >
              {s}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
