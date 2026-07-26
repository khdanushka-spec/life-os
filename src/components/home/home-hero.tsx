"use client";

import { motion } from "framer-motion";
import { Clock, ListChecks, CheckCircle2, AlertCircle } from "lucide-react";
import { BrisbaneClock } from "@/components/brisbane-clock";
import { fadeInUp } from "@/lib/motion";
import type { Weather } from "@/lib/weather";

function buildDailySummary({
  tasksDueToday,
  tasksOverdue,
  tasksCompletedToday,
}: {
  tasksDueToday: number;
  tasksOverdue: number;
  tasksCompletedToday: number;
}): string {
  if (tasksOverdue > 0) {
    return `You have ${tasksOverdue} overdue and ${tasksDueToday} due today — worth clearing the backlog first.`;
  }
  if (tasksDueToday > 0) {
    return tasksCompletedToday > 0
      ? `${tasksDueToday} things due today, and you've already knocked out ${tasksCompletedToday}. Keep going.`
      : `You have ${tasksDueToday} things due today. Nothing's done yet — a good place to start.`;
  }
  if (tasksCompletedToday > 0) {
    return `Nothing due today, and you've already completed ${tasksCompletedToday}. Nice work.`;
  }
  return "Nothing urgent on the books today — a good day to get ahead on something.";
}

function MiniStat({ icon: Icon, value, label }: { icon: typeof ListChecks; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-metric text-lg">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function HomeHero({
  greetingWord,
  name,
  dateLabel,
  weather,
  tasksDueToday,
  tasksCompletedToday,
  tasksOverdue,
}: {
  greetingWord: string;
  name: string;
  dateLabel: string;
  weather: Weather | null;
  tasksDueToday: number;
  tasksCompletedToday: number;
  tasksOverdue: number;
}) {
  const summary = buildDailySummary({ tasksDueToday, tasksOverdue, tasksCompletedToday });

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%)]"
      />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-display">
              {greetingWord}, {name}.
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" /> {dateLabel}, <BrisbaneClock />
              </span>
              {weather && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{weather.icon}</span> {weather.tempC}°C, {weather.condition}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5 rounded-xl border border-border bg-background/40 px-4 py-2.5">
            <MiniStat icon={ListChecks} value={tasksDueToday} label="due today" />
            <MiniStat icon={CheckCircle2} value={tasksCompletedToday} label="done" />
            {tasksOverdue > 0 && <MiniStat icon={AlertCircle} value={tasksOverdue} label="overdue" />}
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3.5 text-sm">
          <div className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center">
            <div aria-hidden className="absolute inset-0 rounded-full bg-primary/25 blur-sm" />
            <span className="relative text-sm">✨</span>
          </div>
          <p className="text-foreground/90">{summary}</p>
        </div>
      </div>
    </motion.div>
  );
}
