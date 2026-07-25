import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { brisbaneDateKey } from "@/lib/date";
import {
  todayDateKey,
  isScheduledForDate,
  computeHabitStreak,
  computeLongestStreak,
  computeSuccessRate,
  computeWeekdayBreakdown,
  bestAndWorstDay,
  computeWeeklySeries,
  computeMonthlySeries,
  computeAverageCompletionTime,
  TIME_OF_DAY_META,
  SCHEDULE_META,
  GOAL_TYPE_META,
  DIFFICULTY_META,
  PRIORITY_META,
} from "@/lib/habits";
import { CalendarHeatmap, type HeatmapDay } from "@/components/habits/calendar-heatmap";
import { HabitSeriesChart } from "@/components/habits/habit-series-chart";
import { AchievementTimeline } from "@/components/habits/achievement-timeline";
import { HabitHistoryList } from "@/components/habits/habit-history-list";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/50 p-3">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function HabitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbUser = await requireDbUser();

  const habit = await prisma.habit.findFirst({
    where: { id, userId: dbUser.id },
    include: { logs: { orderBy: { date: "desc" } }, category: true, achievements: true },
  });

  if (!habit) notFound();

  const logDateKeys = new Set(habit.logs.map((l) => l.date.toISOString().slice(0, 10)));
  const createdAtKey = brisbaneDateKey(habit.createdAt);
  const shape = { schedule: habit.schedule, customDays: habit.customDays };
  const todayKey = todayDateKey();

  const streak = computeHabitStreak(shape, logDateKeys);
  const longestStreak = computeLongestStreak(shape, logDateKeys, createdAtKey);
  const successRate = computeSuccessRate(shape, logDateKeys, createdAtKey);
  const weekdayBreakdown = computeWeekdayBreakdown(shape, logDateKeys, createdAtKey);
  const { best, worst } = bestAndWorstDay(weekdayBreakdown);
  const weeklySeries = computeWeeklySeries(shape, logDateKeys, createdAtKey, 12);
  const monthlySeries = computeMonthlySeries(shape, logDateKeys, createdAtKey, 6);
  const averageCompletionTime = computeAverageCompletionTime(
    habit.logs.map((l) => l.completedAt).filter((d): d is Date => d != null),
  );

  const totalDays = 182;
  const end = new Date(`${todayKey}T00:00:00.000Z`);
  const heatmapDays: HeatmapDay[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    const dateKey = d.toISOString().slice(0, 10);
    const beforeCreation = dateKey < createdAtKey;
    const completed = logDateKeys.has(dateKey);
    const scheduled = !beforeCreation && isScheduledForDate(shape, dateKey);
    heatmapDays.push({
      dateKey,
      status: beforeCreation ? "before-creation" : completed ? "completed" : scheduled ? "missed" : "not-scheduled",
      note: habit.logs.find((l) => l.date.toISOString().slice(0, 10) === dateKey)?.note ?? null,
      isToday: dateKey === todayKey,
    });
  }

  const historyEntries = habit.logs.slice(0, 60).map((l) => ({
    dateKey: l.date.toISOString().slice(0, 10),
    value: l.value,
    note: l.note,
  }));

  const habitAchievements = [...habit.achievements].sort(
    (a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime(),
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6">
      <Link href="/habits" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Habits
      </Link>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="text-4xl">{habit.icon}</span>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl">{habit.title}</CardTitle>
              {habit.description && <p className="text-sm text-muted-foreground">{habit.description}</p>}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {habit.category && (
                  <Badge
                    variant="secondary"
                    style={{ backgroundColor: `${habit.category.color}20`, color: habit.category.color }}
                  >
                    {habit.category.icon} {habit.category.name}
                  </Badge>
                )}
                <Badge variant="outline">
                  {TIME_OF_DAY_META[habit.timeOfDay].icon} {TIME_OF_DAY_META[habit.timeOfDay].label}
                </Badge>
                <Badge variant="outline">{SCHEDULE_META[habit.schedule].label}</Badge>
                <Badge variant="outline">{GOAL_TYPE_META[habit.goalType].label}</Badge>
                <Badge variant="outline" className={DIFFICULTY_META[habit.difficulty].color}>
                  {DIFFICULTY_META[habit.difficulty].label}
                </Badge>
                <Badge variant="outline">{PRIORITY_META[habit.priority].label} priority</Badge>
                {habit.estimatedMinutes && <Badge variant="outline">{habit.estimatedMinutes} min</Badge>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Current Streak" value={`${streak}`} />
            <StatTile label="Longest Streak" value={`${longestStreak}`} />
            <StatTile label="Success Rate" value={`${successRate}%`} />
            <StatTile label="Total Completions" value={`${habit.logs.length}`} />
          </div>
          {(habit.motivation || habit.reward) && (
            <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 text-sm">
              {habit.motivation && (
                <p>
                  <span className="font-medium">Why: </span>
                  {habit.motivation}
                </p>
              )}
              {habit.reward && (
                <p>
                  <span className="font-medium">Reward: </span>
                  {habit.reward}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarHeatmap days={heatmapDays} />
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">Weekly Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <HabitSeriesChart data={weeklySeries} color={habit.color} />
          </CardContent>
        </Card>
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">Monthly Consistency</CardTitle>
          </CardHeader>
          <CardContent>
            <HabitSeriesChart data={monthlySeries} color={habit.color} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Insights</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Best Day" value={best ? `${best.weekday} (${best.percent}%)` : "—"} />
          <StatTile label="Most Missed Day" value={worst ? `${worst.weekday} (${worst.percent}%)` : "—"} />
          <StatTile label="Avg. Completion Time" value={averageCompletionTime ?? "—"} />
          <StatTile label="Longest Streak Ever" value={`${longestStreak} days`} />
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <AchievementTimeline achievements={habitAchievements} />
          </CardContent>
        </Card>
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            <HabitHistoryList entries={historyEntries} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
