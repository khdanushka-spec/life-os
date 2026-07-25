import { z } from "zod";
import {
  Inbox,
  CalendarClock,
  CalendarDays,
  AlertTriangle,
  CalendarRange,
  Hourglass,
  Coffee,
  CheckCircle2,
  Archive,
  Pin,
} from "lucide-react";
import type { Priority, EnergyLevel, TaskStatus } from "@/generated/prisma/client";

// Priority reuses the dataviz-skill's fixed STATUS palette (good -> warning
// -> serious -> critical) rather than inventing new hues: priority IS a
// state/urgency indicator, exactly what that palette is defined for, and
// its four steps are mode-invariant (same hex in light/dark) per
// palette.md, so no separate dark variant is needed. Someday gets the
// neutral "muted" ink token since it carries no urgency at all.
export const PRIORITY_META: Record<Priority, { label: string; color: string; weight: number }> = {
  CRITICAL: { label: "Critical", color: "#d03b3b", weight: 5 },
  HIGH: { label: "High", color: "#ec835a", weight: 4 },
  MEDIUM: { label: "Medium", color: "#fab219", weight: 3 },
  LOW: { label: "Low", color: "#0ca30c", weight: 2 },
  SOMEDAY_PRIORITY: { label: "Someday", color: "#898781", weight: 1 },
};

// Energy is a genuine ordinal magnitude (not urgency), so per the dataviz
// skill it wants a single-hue monotone ramp. Reusing the theme's own
// --primary token at increasing opacity satisfies "single hue, monotone
// lightness" for free and stays theme-aware (light/dark, brand changes)
// without hardcoding a second validated hex ramp.
export const ENERGY_META: Record<EnergyLevel, { label: string; opacityClass: string }> = {
  VERY_LOW: { label: "Very Low", opacityClass: "bg-primary/20" },
  LOW: { label: "Low", opacityClass: "bg-primary/40" },
  MEDIUM: { label: "Medium", opacityClass: "bg-primary/60" },
  HIGH: { label: "High", opacityClass: "bg-primary/80" },
  DEEP_FOCUS: { label: "Deep Focus", opacityClass: "bg-primary" },
};

export const SMART_LISTS = [
  { id: "today", label: "Today", icon: CalendarClock },
  { id: "upcoming", label: "Upcoming", icon: CalendarDays },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "overdue", label: "Overdue", icon: AlertTriangle },
  { id: "week", label: "This Week", icon: CalendarRange },
  { id: "waiting", label: "Waiting", icon: Hourglass },
  { id: "someday", label: "Someday", icon: Coffee },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
  { id: "pinned", label: "Pinned", icon: Pin },
  { id: "archive", label: "Archive", icon: Archive },
] as const;
export type SmartListId = (typeof SMART_LISTS)[number]["id"];

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export type FocusScoreBreakdown = {
  score: number;
  completionRate: { value: number; score: number };
  overdueImpact: { count: number; score: number };
  workloadFit: { estimatedMinutes: number; score: number };
};

const DAILY_CAPACITY_MINUTES = 6 * 60;

// Deterministic, documented weighted formula - never AI-guessed, same
// principle as computeHealthScore in lib/finance.ts. Weights: today's
// completion rate 50%, overdue impact 30%, workload-vs-capacity fit 20%.
export function computeFocusScore(input: {
  dueTodayCount: number;
  completedTodayCount: number;
  overdueCount: number;
  estimatedMinutesToday: number;
}): FocusScoreBreakdown {
  const completionValue = input.dueTodayCount > 0 ? input.completedTodayCount / input.dueTodayCount : 1;
  const completionScore = clampScore(completionValue * 100);

  const overdueScore = clampScore(100 - input.overdueCount * 15);

  const workloadRatio = input.estimatedMinutesToday / DAILY_CAPACITY_MINUTES;
  const workloadScore = clampScore(workloadRatio <= 1 ? 100 : 100 - (workloadRatio - 1) * 100);

  const score = clampScore(completionScore * 0.5 + overdueScore * 0.3 + workloadScore * 0.2);

  return {
    score,
    completionRate: { value: completionValue, score: completionScore },
    overdueImpact: { count: input.overdueCount, score: overdueScore },
    workloadFit: { estimatedMinutes: input.estimatedMinutesToday, score: workloadScore },
  };
}

// When subtasks exist, progress is always derived from their completion -
// manualProgress is only used for tasks with no subtasks, so the two
// numbers can never disagree.
export function computeProgress(
  subtasks: { status: TaskStatus }[] | null | undefined,
  manualProgress: number | null,
): number | null {
  if (subtasks && subtasks.length > 0) {
    const done = subtasks.filter((s) => s.status === "DONE").length;
    return Math.round((done / subtasks.length) * 100);
  }
  return manualProgress;
}

export function estimateWorkloadMinutes(
  tasks: { estimatedMinutes: number | null; status: TaskStatus }[],
): number {
  return tasks
    .filter((t) => t.status !== "DONE")
    .reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0);
}

// Buckets completion dates into a day -> count map, for the analytics
// heatmap (reuses the same month-grid rendering pattern already built
// for Journal/Finance calendars).
export function completionsByDay(completedDates: Date[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of completedDates) {
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

// The AI only ever fills in these narrative fields for a daily/weekly/
// monthly review - every number is computed separately and merged in,
// same "AI narrates, math computes" principle as Finance's reports.
export const taskReportNarrativeSchema = z.object({
  overview: z.string(),
  wins: z.array(z.string()).max(5),
  challenges: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
});
export type TaskReportNarrative = z.infer<typeof taskReportNarrativeSchema>;

export type TaskReportSummary = TaskReportNarrative & {
  totalCompleted: number;
  totalCreated: number;
  completionRate: number;
  topProjects: { project: string; count: number }[];
};
