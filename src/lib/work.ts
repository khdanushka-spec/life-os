import { z } from "zod";
import { brisbaneDateKey } from "@/lib/date";
import type { ProjectStatus, TaskStatus } from "@/generated/prisma/client";

// The AI only ever fills in these narrative fields - every number in a
// report is computed separately and merged in, same "AI narrates, math
// computes" principle as Tasks'/Finance's reports.
export const workReportNarrativeSchema = z.object({
  overview: z.string(),
  wins: z.array(z.string()).max(5),
  challenges: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
});
export type WorkReportNarrative = z.infer<typeof workReportNarrativeSchema>;

export type WorkReportSummary = WorkReportNarrative & {
  projectsCompleted: number;
  projectsActive: number;
  deadlinesMet: number;
  deadlinesMissed: number;
  meetingsHeld: number;
  topClients: { client: string; count: number }[];
};

export const PROJECT_COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#64748b",
];

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "text-sky-600 dark:text-sky-400" },
  ON_HOLD: { label: "On Hold", color: "text-amber-600 dark:text-amber-400" },
  COMPLETED: { label: "Completed", color: "text-emerald-600 dark:text-emerald-400" },
  CANCELLED: { label: "Cancelled", color: "text-muted-foreground" },
};

// % of a project's tasks that are DONE - same "no separate stored number
// that can disagree with reality" principle as Task.progressPercent only
// applying when there are no subtasks.
export function computeProjectProgress(tasks: { status: TaskStatus }[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

export type DeadlineInfo = {
  label: string;
  overdue: boolean;
  urgent: boolean; // due within 3 days
};

// Brisbane-day-based, not raw millisecond diff, so "tomorrow" doesn't
// flip depending on what hour it currently is.
export function formatDeadline(deadline: Date | null): DeadlineInfo | null {
  if (!deadline) return null;
  const deadlineKey = brisbaneDateKey(deadline);
  const todayKey = brisbaneDateKey();
  const days = Math.round(
    (new Date(`${deadlineKey}T00:00:00Z`).getTime() - new Date(`${todayKey}T00:00:00Z`).getTime()) / 86_400_000,
  );

  if (days < 0) return { label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`, overdue: true, urgent: true };
  if (days === 0) return { label: "Due today", overdue: false, urgent: true };
  if (days === 1) return { label: "Due tomorrow", overdue: false, urgent: true };
  if (days <= 3) return { label: `Due in ${days} days`, overdue: false, urgent: true };
  return { label: `Due in ${days} days`, overdue: false, urgent: false };
}

export function formatMeetingTime(date: Date): string {
  return date.toLocaleString("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function splitMeetingsByTime<T extends { startTime: Date }>(
  meetings: T[],
  now: Date = new Date(),
): { upcoming: T[]; past: T[] } {
  const upcoming = meetings.filter((m) => m.startTime >= now).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const past = meetings.filter((m) => m.startTime < now).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  return { upcoming, past };
}

export function isWithinNextDays(date: Date, days: number, now: Date = new Date()): boolean {
  const end = new Date(now.getTime() + days * 86_400_000);
  return date >= now && date <= end;
}
