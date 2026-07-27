"use client";

import { AlertCircle, CheckCircle2, ListChecks, Sparkles, Target, TrendingUp } from "lucide-react";
import { greeting } from "@/lib/greeting";
import { StatCard } from "@/components/stat-card";
import type { FocusScoreBreakdown } from "@/lib/tasks";

export function TasksHero({
  name,
  focusScore,
  dueTodayCount,
  overdueCount,
  completedTodayCount,
  weeklyCompletionPercent,
}: {
  name: string;
  focusScore: FocusScoreBreakdown;
  dueTodayCount: number;
  overdueCount: number;
  completedTodayCount: number;
  weeklyCompletionPercent: number;
}) {
  const today = new Date();

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card/60 p-6 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
      />
      <div className="relative flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {name}.
          </h1>
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString("en-AU", {
              timeZone: "Australia/Brisbane",
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard icon={Target} label="Focus Score" value={focusScore.score} suffix="%" accent="bg-primary" />
          <StatCard icon={ListChecks} label="Today's Tasks" value={dueTodayCount} accent="bg-sky-500" />
          <StatCard icon={CheckCircle2} label="Completed" value={completedTodayCount} accent="bg-success" />
          <StatCard
            icon={AlertCircle}
            label="Overdue"
            value={overdueCount}
            accent={overdueCount > 0 ? "bg-destructive" : "bg-muted-foreground"}
          />
          <StatCard
            icon={TrendingUp}
            label="Weekly Progress"
            value={weeklyCompletionPercent}
            suffix="%"
            accent="bg-violet-500"
          />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Everything important in one place.
        </p>
      </div>
    </div>
  );
}
