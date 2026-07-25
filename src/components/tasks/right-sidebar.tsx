import Link from "next/link";
import { Sparkles, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MiniCalendar } from "@/components/tasks/mini-calendar";
import { FocusTimer } from "@/components/tasks/focus-timer";
import { QuickNote } from "@/components/tasks/quick-note";
import { PRIORITY_META } from "@/lib/tasks";
import { getBrisbaneWeather } from "@/lib/weather";
import { prisma } from "@/lib/prisma";
import type { Task } from "@/generated/prisma/client";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function RightSidebar({
  userId,
  tasks,
  dailyInsight,
}: {
  userId: string;
  tasks: Task[];
  dailyInsight: string | null;
}) {
  const [weather, quickNote] = await Promise.all([
    getBrisbaneWeather(),
    prisma.quickNote.findUnique({ where: { userId } }),
  ]);

  const now = new Date();
  const today = startOfDay(now);
  const todaysSchedule = tasks
    .filter((t) => t.dueDate && startOfDay(t.dueDate).getTime() === today.getTime() && t.status !== "DONE")
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));

  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && t.dueDate > now && t.status !== "DONE")
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
    .slice(0, 5);

  const recentActivity = [...tasks]
    .filter((t) => t.status === "DONE" && t.completedAt)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, 5);

  const dueDates = tasks.filter((t): t is Task & { dueDate: Date } => !!t.dueDate);

  return (
    <div className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
      {dailyInsight && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-primary" /> AI Daily Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{dailyInsight}</p>
          </CardContent>
        </Card>
      )}

      {weather && (
        <Card>
          <CardContent className="flex items-center gap-2 py-3 text-sm">
            <span className="text-lg">{weather.icon}</span>
            {weather.location}, {weather.tempC}°C, {weather.condition}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-primary" /> Today&apos;s Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {todaysSchedule.length === 0 && <p className="text-xs text-muted-foreground">Nothing scheduled.</p>}
          {todaysSchedule.map((t) => (
            <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-2 text-xs hover:text-primary">
              <span className="w-12 shrink-0 text-muted-foreground">
                {t.dueDate?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </span>
              {t.title}
            </Link>
          ))}
        </CardContent>
      </Card>

      <MiniCalendar dueDates={dueDates.map((t) => t.dueDate)} />

      <FocusTimer />

      <QuickNote initialContent={quickNote?.content ?? ""} />

      {upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-primary" /> Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {upcomingDeadlines.map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center justify-between gap-2 text-xs hover:text-primary">
                <span className="truncate">{t.title}</span>
                <Badge variant="secondary" className="shrink-0 text-[10px]" style={{ color: PRIORITY_META[t.priority].color }}>
                  {t.dueDate?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {recentActivity.map((t) => (
              <p key={t.id} className="truncate text-xs text-muted-foreground">
                <span className="text-foreground">Completed</span> {t.title}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
