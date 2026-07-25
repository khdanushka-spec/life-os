import { brisbaneDateKey, brisbaneHour } from "@/lib/date";
import type { HabitDifficulty, HabitGoalType, HabitPriority, HabitSchedule, HabitTimeOfDay } from "@/generated/prisma/client";

// Brisbane's calendar date, not the server's (Vercel runs UTC) - a habit
// toggled at 1am Brisbane time was previously logged against yesterday's
// UTC date, silently "un-completing" the habit once the app's own UTC
// clock caught up hours later.
export function todayDateKey(): string {
  return brisbaneDateKey();
}

// Full history is needed for streaks/heatmaps/achievements (a habit can be
// years old); the 60-day cutoff is only for the lightweight main-list view.
export function habitLogCutoffDate(): Date {
  return new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
}

const ITERATION_CAP = 3650; // ~10 years - a sane backstop against misconfigured schedules

type ScheduleShape = { schedule: HabitSchedule; customDays: number[] };

function dateKeyWeekday(dateKey: string): number {
  // Sun=0..Sat=6. dateKey's UTC components already equal the Brisbane
  // calendar date (see lib/date.ts's brisbaneDateKey), so this is safe.
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

export function isScheduledForDate(habit: ScheduleShape, dateKey: string): boolean {
  if (habit.schedule === "DAILY") return true;
  const weekday = dateKeyWeekday(dateKey);
  if (habit.schedule === "WEEKDAYS") return weekday >= 1 && weekday <= 5;
  if (habit.schedule === "WEEKENDS") return weekday === 0 || weekday === 6;
  return habit.customDays.includes(weekday); // CUSTOM
}

function toUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function keyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Counts consecutive completed days ending today. If today isn't done yet,
// still counts back from yesterday so a streak doesn't visually reset to 0
// before the day is even over. Generic (no schedule awareness) - shared
// with Journal/Tasks daily streaks, which have no concept of a schedule.
export function computeStreak(logDateKeys: Set<string>): number {
  let streak = 0;
  const cursor = toUtcDate(todayDateKey());

  if (!logDateKeys.has(keyOf(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (logDateKeys.has(keyOf(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// Same idea as computeStreak, but schedule-aware: skips days the habit
// wasn't due (so a weekdays-only habit's streak survives the weekend)
// instead of treating them as misses.
export function computeHabitStreak(habit: ScheduleShape, logDateKeys: Set<string>): number {
  let streak = 0;
  const cursor = toUtcDate(todayDateKey());

  if (isScheduledForDate(habit, keyOf(cursor)) && !logDateKeys.has(keyOf(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  for (let i = 0; i < ITERATION_CAP; i++) {
    const k = keyOf(cursor);
    if (!isScheduledForDate(habit, k)) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }
    if (!logDateKeys.has(k)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// Longest run of consecutive scheduled-and-completed days across the
// habit's whole lifetime (createdAt to today).
export function computeLongestStreak(
  habit: ScheduleShape,
  logDateKeys: Set<string>,
  createdAtKey: string,
): number {
  let longest = 0;
  let current = 0;
  const cursor = toUtcDate(createdAtKey);
  const end = toUtcDate(todayDateKey());

  for (let i = 0; i < ITERATION_CAP && cursor <= end; i++) {
    const k = keyOf(cursor);
    if (isScheduledForDate(habit, k)) {
      if (logDateKeys.has(k)) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return longest;
}

// % of scheduled days (since creation) that were actually completed.
export function computeSuccessRate(
  habit: ScheduleShape,
  logDateKeys: Set<string>,
  createdAtKey: string,
): number {
  let scheduled = 0;
  let completed = 0;
  const cursor = toUtcDate(createdAtKey);
  const end = toUtcDate(todayDateKey());

  for (let i = 0; i < ITERATION_CAP && cursor <= end; i++) {
    const k = keyOf(cursor);
    if (isScheduledForDate(habit, k)) {
      scheduled++;
      if (logDateKeys.has(k)) completed++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
}

export type HabitConsistencyInput = ScheduleShape & { createdAtKey: string; logDateKeys: Set<string> };

// % of scheduled habit-days completed across ALL habits in the last 30
// days - the account-wide "Consistency" stat card.
export function computeConsistency30(habits: HabitConsistencyInput[]): number {
  const end = toUtcDate(todayDateKey());
  let scheduled = 0;
  let completed = 0;

  for (const habit of habits) {
    const createdAt = toUtcDate(habit.createdAtKey);
    const windowStart = new Date(end.getTime() - 29 * 86_400_000);
    const cursor = new Date(Math.max(windowStart.getTime(), createdAt.getTime()));
    for (let i = 0; i < ITERATION_CAP && cursor <= end; i++) {
      const k = keyOf(cursor);
      if (isScheduledForDate(habit, k)) {
        scheduled++;
        if (habit.logDateKeys.has(k)) completed++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
}

// Weekday vs. weekend completion % across ALL habits over the last 30
// days - backs the "you perform better on X" insight. null when there's
// no scheduled data in that bucket yet.
export function computeWeekdayVsWeekend(
  habits: HabitConsistencyInput[],
): { weekdayPercent: number | null; weekendPercent: number | null } {
  const end = toUtcDate(todayDateKey());
  let wdScheduled = 0;
  let wdCompleted = 0;
  let weScheduled = 0;
  let weCompleted = 0;

  for (const habit of habits) {
    const createdAt = toUtcDate(habit.createdAtKey);
    const windowStart = new Date(end.getTime() - 29 * 86_400_000);
    const cursor = new Date(Math.max(windowStart.getTime(), createdAt.getTime()));
    for (let i = 0; i < ITERATION_CAP && cursor <= end; i++) {
      const k = keyOf(cursor);
      if (isScheduledForDate(habit, k)) {
        const isWeekend = cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6;
        const done = habit.logDateKeys.has(k);
        if (isWeekend) {
          weScheduled++;
          if (done) weCompleted++;
        } else {
          wdScheduled++;
          if (done) wdCompleted++;
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return {
    weekdayPercent: wdScheduled === 0 ? null : Math.round((wdCompleted / wdScheduled) * 100),
    weekendPercent: weScheduled === 0 ? null : Math.round((weCompleted / weScheduled) * 100),
  };
}

// Consecutive days (ending today, or yesterday if today isn't over yet)
// where every habit scheduled that day was completed. Backs both the
// "Today's Streak" stat card and the Perfect Week/Month achievements.
export function computePerfectDayStreak(habits: HabitConsistencyInput[]): number {
  const isPerfectDay = (dateKey: string): boolean => {
    let anyScheduled = false;
    for (const habit of habits) {
      if (toUtcDate(dateKey) < toUtcDate(habit.createdAtKey)) continue;
      if (isScheduledForDate(habit, dateKey)) {
        anyScheduled = true;
        if (!habit.logDateKeys.has(dateKey)) return false;
      }
    }
    return anyScheduled;
  };

  const cursor = toUtcDate(todayDateKey());
  if (!isPerfectDay(keyOf(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  for (let i = 0; i < ITERATION_CAP; i++) {
    if (!isPerfectDay(keyOf(cursor))) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// Deterministic composite score (0-100) - "AI narrates, math computes":
// this is plain arithmetic, not a model call. Weighted toward today's
// actual completion, with consistency and lifetime success rate behind it.
export function computeHabitScore(input: {
  todayCompletionPercent: number;
  consistency30: number;
  avgSuccessRate: number;
}): number {
  return Math.round(
    input.todayCompletionPercent * 0.4 + input.consistency30 * 0.3 + input.avgSuccessRate * 0.3,
  );
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type WeekdayStat = { weekday: string; percent: number; scheduled: number };

export function computeWeekdayBreakdown(
  habit: ScheduleShape,
  logDateKeys: Set<string>,
  createdAtKey: string,
): WeekdayStat[] {
  const scheduled = new Array(7).fill(0);
  const completed = new Array(7).fill(0);
  const cursor = toUtcDate(createdAtKey);
  const end = toUtcDate(todayDateKey());

  for (let i = 0; i < ITERATION_CAP && cursor <= end; i++) {
    const k = keyOf(cursor);
    const weekday = cursor.getUTCDay();
    if (isScheduledForDate(habit, k)) {
      scheduled[weekday]++;
      if (logDateKeys.has(k)) completed[weekday]++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return WEEKDAY_NAMES.map((weekday, i) => ({
    weekday,
    scheduled: scheduled[i],
    percent: scheduled[i] === 0 ? 0 : Math.round((completed[i] / scheduled[i]) * 100),
  }));
}

export function bestAndWorstDay(breakdown: WeekdayStat[]): { best: WeekdayStat | null; worst: WeekdayStat | null } {
  const withData = breakdown.filter((d) => d.scheduled >= 2);
  if (withData.length === 0) return { best: null, worst: null };
  const sorted = [...withData].sort((a, b) => b.percent - a.percent);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

export type SeriesPoint = { label: string; percent: number };

// Last `weeks` calendar weeks (Mon-Sun-ish rolling 7-day buckets ending
// today), for the details page's weekly graph.
export function computeWeeklySeries(habit: ScheduleShape, logDateKeys: Set<string>, createdAtKey: string, weeks = 12): SeriesPoint[] {
  const end = toUtcDate(todayDateKey());
  const createdAt = toUtcDate(createdAtKey);
  const points: SeriesPoint[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(end.getTime() - w * 7 * 86_400_000);
    const weekStart = new Date(weekEnd.getTime() - 6 * 86_400_000);
    let scheduled = 0;
    let completed = 0;
    const cursor = new Date(Math.max(weekStart.getTime(), createdAt.getTime()));
    while (cursor <= weekEnd) {
      const k = keyOf(cursor);
      if (isScheduledForDate(habit, k)) {
        scheduled++;
        if (logDateKeys.has(k)) completed++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    points.push({
      label: weekStart.toLocaleDateString("en-AU", { month: "short", day: "numeric", timeZone: "UTC" }),
      percent: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
    });
  }
  return points;
}

// Last `months` calendar months, for the details page's monthly graph.
export function computeMonthlySeries(habit: ScheduleShape, logDateKeys: Set<string>, createdAtKey: string, months = 6): SeriesPoint[] {
  const todayKey = todayDateKey();
  const [ty, tm] = todayKey.split("-").map(Number);
  const today = toUtcDate(todayKey);
  const createdAt = toUtcDate(createdAtKey);
  const points: SeriesPoint[] = [];

  for (let m = months - 1; m >= 0; m--) {
    const monthDate = new Date(Date.UTC(ty, tm - 1 - m, 1));
    const monthStart = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0));
    const effectiveEnd = monthEnd > today ? today : monthEnd;
    let scheduled = 0;
    let completed = 0;
    if (effectiveEnd >= monthStart) {
      const cursor = new Date(Math.max(monthStart.getTime(), createdAt.getTime()));
      while (cursor <= effectiveEnd) {
        const k = keyOf(cursor);
        if (isScheduledForDate(habit, k)) {
          scheduled++;
          if (logDateKeys.has(k)) completed++;
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    points.push({
      label: monthStart.toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" }),
      percent: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
    });
  }
  return points;
}

// Average hour-of-day (Brisbane) a habit gets completed, from logs that
// have a completedAt timestamp (pre-redesign logs don't, and are skipped).
export function computeAverageCompletionTime(completedAts: Date[]): string | null {
  if (completedAts.length === 0) return null;
  const totalMinutes = completedAts.reduce((sum, d) => {
    const hour = brisbaneHour(d);
    return sum + hour * 60 + d.getUTCMinutes();
  }, 0);
  const avgMinutes = Math.round(totalMinutes / completedAts.length);
  const h24 = Math.floor(avgMinutes / 60) % 24;
  const m = avgMinutes % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// ---- Metadata for UI (icon/label pickers, badges) ----

export const TIME_OF_DAY_META: Record<HabitTimeOfDay, { label: string; icon: string }> = {
  MORNING: { label: "Morning", icon: "🌅" },
  AFTERNOON: { label: "Afternoon", icon: "☀️" },
  EVENING: { label: "Evening", icon: "🌙" },
  ANYTIME: { label: "Anytime", icon: "✨" },
};

export const SCHEDULE_META: Record<HabitSchedule, { label: string }> = {
  DAILY: { label: "Every day" },
  WEEKDAYS: { label: "Weekdays" },
  WEEKENDS: { label: "Weekends" },
  CUSTOM: { label: "Custom" },
};

export const GOAL_TYPE_META: Record<HabitGoalType, { label: string }> = {
  ONCE: { label: "Once a day" },
  MULTIPLE: { label: "Multiple times" },
  DURATION: { label: "Duration" },
};

export const DIFFICULTY_META: Record<HabitDifficulty, { label: string; color: string }> = {
  EASY: { label: "Easy", color: "text-emerald-600 dark:text-emerald-400" },
  MEDIUM: { label: "Medium", color: "text-amber-600 dark:text-amber-400" },
  HARD: { label: "Hard", color: "text-rose-600 dark:text-rose-400" },
};

export const PRIORITY_META: Record<HabitPriority, { label: string }> = {
  LOW: { label: "Low" },
  MEDIUM: { label: "Medium" },
  HIGH: { label: "High" },
};

export const HABIT_ICON_OPTIONS = [
  "✨", "💧", "🏃", "📖", "🧘", "🍎", "😴", "💪", "🎯", "🧠",
  "✍️", "🎨", "🎵", "☕", "🚭", "💰", "🌱", "🦷", "🧹", "📵",
  "☀️", "🌙", "🚶", "🩺",
];

export const HABIT_COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#64748b",
];

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ---- Achievements ----

export const ACHIEVEMENT_KEYS = [
  "FIRST_HABIT",
  "STREAK_7",
  "STREAK_30",
  "COMPLETIONS_100",
  "PERFECT_WEEK",
  "PERFECT_MONTH",
  "CONSISTENCY_MASTER",
  "EARLY_BIRD",
  "NIGHT_OWL",
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];

export const ACHIEVEMENTS: Record<AchievementKey, { title: string; description: string; icon: string }> = {
  FIRST_HABIT: { title: "First Habit", description: "Created your first habit.", icon: "🌱" },
  STREAK_7: { title: "7 Day Streak", description: "Kept a habit going for 7 days straight.", icon: "🔥" },
  STREAK_30: { title: "30 Day Streak", description: "Kept a habit going for 30 days straight.", icon: "🏆" },
  COMPLETIONS_100: { title: "100 Completions", description: "Logged 100 habit completions.", icon: "💯" },
  PERFECT_WEEK: { title: "Perfect Week", description: "Completed every scheduled habit for 7 days straight.", icon: "⭐" },
  PERFECT_MONTH: { title: "Perfect Month", description: "Completed every scheduled habit for 30 days straight.", icon: "🌟" },
  CONSISTENCY_MASTER: { title: "Consistency Master", description: "Reached 90%+ consistency over the last 30 days.", icon: "🎯" },
  EARLY_BIRD: { title: "Early Bird", description: "Completed 10 habits before 8am.", icon: "🌇" },
  NIGHT_OWL: { title: "Night Owl", description: "Completed 10 habits after 9pm.", icon: "🦉" },
};

// Returns every achievement the account currently qualifies for (not just
// newly-earned ones) - the caller diffs against what's already persisted
// and inserts only what's missing, so this stays simple and idempotent.
export function evaluateQualifyingAchievements(input: {
  totalHabits: number;
  totalCompletions: number;
  maxLongestStreak: number;
  perfectDayStreak: number;
  consistency30: number;
  earlyBirdCount: number;
  nightOwlCount: number;
}): AchievementKey[] {
  const earned: AchievementKey[] = [];
  if (input.totalHabits >= 1) earned.push("FIRST_HABIT");
  if (input.maxLongestStreak >= 7) earned.push("STREAK_7");
  if (input.maxLongestStreak >= 30) earned.push("STREAK_30");
  if (input.totalCompletions >= 100) earned.push("COMPLETIONS_100");
  if (input.perfectDayStreak >= 7) earned.push("PERFECT_WEEK");
  if (input.perfectDayStreak >= 30) earned.push("PERFECT_MONTH");
  if (input.consistency30 >= 90) earned.push("CONSISTENCY_MASTER");
  if (input.earlyBirdCount >= 10) earned.push("EARLY_BIRD");
  if (input.nightOwlCount >= 10) earned.push("NIGHT_OWL");
  return earned;
}

// ---- Rule-based "insight" narration (deterministic, not a model call -
// same "AI narrates, math computes" philosophy as the rest of the app) ----

export function generateInsights(input: {
  topStreakHabitTitle: string | null;
  topStreak: number;
  perfectDayStreak: number;
  consistency30: number;
  todayCompletionPercent: number;
  weekdayPercent: number | null;
  weekendPercent: number | null;
}): string[] {
  const insights: string[] = [];

  if (input.topStreakHabitTitle && input.topStreak >= 3) {
    insights.push(
      `You've completed ${input.topStreakHabitTitle} for ${input.topStreak} consecutive day${input.topStreak === 1 ? "" : "s"}.`,
    );
  }

  if (input.perfectDayStreak >= 2) {
    insights.push(`You're on a ${input.perfectDayStreak}-day perfect streak — every scheduled habit, done.`);
  }

  if (
    input.weekdayPercent !== null &&
    input.weekendPercent !== null &&
    Math.abs(input.weekdayPercent - input.weekendPercent) >= 15
  ) {
    const better = input.weekdayPercent > input.weekendPercent ? "weekdays" : "weekends";
    insights.push(`You perform better on ${better} than the alternative.`);
  }

  if (input.todayCompletionPercent < 100 && input.consistency30 >= 80) {
    insights.push(`Completing one more habit today keeps your 30-day consistency above ${input.consistency30}%.`);
  }

  return insights.slice(0, 3);
}
