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

const timeline = {
  current: [{ time: "10:00", title: "Deep work: Phase 1 build" }],
  next: [{ time: "12:00", title: "Lunch + short walk" }],
  later: [
    { time: "15:00", title: "Team sync" },
    { time: "18:00", title: "Gym" },
  ],
  completed: [{ time: "08:30", title: "Morning journal entry" }],
};

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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

async function getDashboardData(): Promise<{
  name: string;
  tasks: Task[] | null;
}> {
  if (!isSupabaseConfigured()) return { name: "there", tasks: null };

  const dbUser = await requireDbUser();
  const tasks = await prisma.task.findMany({
    where: { userId: dbUser.id, status: "TODO" },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 3,
  });

  const name = dbUser.username ?? dbUser.email?.split("@")[0] ?? "there";
  return { name, tasks };
}

export default async function HomePage() {
  const { name, tasks } = await getDashboardData();
  const today = new Date().toLocaleDateString(undefined, {
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
              <Clock className="size-3.5" /> {today}
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
            <CardDescription>Your day at a glance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {(
              [
                ["Current", timeline.current],
                ["Next", timeline.next],
                ["Later", timeline.later],
                ["Completed", timeline.completed],
              ] as const
            ).map(([label, items]) => (
              <div key={label}>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <div className="flex flex-col gap-1.5">
                  {items.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center gap-2 text-sm"
                    >
                      {label === "Completed" ? (
                        <CheckCircle2 className="size-3.5 text-primary" />
                      ) : (
                        <span className="w-10 shrink-0 text-xs text-muted-foreground">
                          {item.time}
                        </span>
                      )}
                      <span
                        className={
                          label === "Completed"
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
            ))}
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
          {momentum.map((m) => (
            <CircularProgress key={m.label} value={m.value} label={m.label} />
          ))}
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
