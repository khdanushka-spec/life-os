import { z } from "zod";
import { startOfBrisbaneDay } from "@/lib/date";
import type { Mood } from "@/generated/prisma/client";
export { todayDateKey } from "@/lib/habits";

// Shape of JournalReport.summary (a Json column) - enforced here rather
// than as individual columns so the AI output can evolve without a
// migration. Shared between generation (lib/ai/journal.ts) and rendering
// (weekly-report.tsx).
export const journalReportSchema = z.object({
  wins: z.array(z.string()).max(6),
  challenges: z.array(z.string()).max(6),
  moodTrend: z.string(),
  energyTrend: z.string(),
  habitsNote: z.string(),
  lessons: z.array(z.string()).max(6),
  suggestions: z.array(z.string()).max(6),
});
export type JournalReportSummary = z.infer<typeof journalReportSchema>;

// Colors are the dataviz-skill validated 8-slot categorical palette,
// assigned one slot per mood and mapped 1:1 (light/dark pair per slot).
// Always paired with the emoji + label in the UI (never color-alone) —
// three of these slots are below 3:1 contrast on the light surface, and
// beyond 3 slots the set can't clear all-pairs CVD separation, so direct
// labels are the required mitigation, not optional polish.
export const MOODS: {
  value: Mood;
  emoji: string;
  label: string;
  score: number;
  color: { light: string; dark: string };
}[] = [
  { value: "AMAZING", emoji: "\u{1F601}", label: "Amazing", score: 8, color: { light: "#eda100", dark: "#c98500" } },
  { value: "HAPPY", emoji: "\u{1F60A}", label: "Happy", score: 7, color: { light: "#eb6834", dark: "#d95926" } },
  { value: "CALM", emoji: "\u{1F60C}", label: "Calm", score: 6, color: { light: "#1baf7a", dark: "#199e70" } },
  { value: "NEUTRAL", emoji: "\u{1F610}", label: "Neutral", score: 5, color: { light: "#2a78d6", dark: "#3987e5" } },
  { value: "TIRED", emoji: "\u{1F634}", label: "Tired", score: 4, color: { light: "#e87ba4", dark: "#d55181" } },
  { value: "STRESSED", emoji: "\u{1F630}", label: "Stressed", score: 3, color: { light: "#008300", dark: "#008300" } },
  { value: "SAD", emoji: "\u{1F614}", label: "Sad", score: 2, color: { light: "#4a3aa7", dark: "#9085e9" } },
  { value: "FRUSTRATED", emoji: "\u{1F621}", label: "Frustrated", score: 1, color: { light: "#e34948", dark: "#e66767" } },
];

export function moodMeta(mood: Mood | null | undefined) {
  return MOODS.find((m) => m.value === mood) ?? null;
}

export function averageMoodScore(moods: (Mood | null)[]): number | null {
  const scores = moods
    .map((m) => moodMeta(m)?.score)
    .filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// Nearest mood entry to a given average score, for rendering "average mood"
// as an emoji+label rather than a bare number.
export function moodForScore(score: number) {
  return MOODS.reduce((closest, m) =>
    Math.abs(m.score - score) < Math.abs(closest.score - score) ? m : closest,
  );
}

export const TAG_SUGGESTIONS = [
  "Work",
  "Family",
  "Finance",
  "Learning",
  "Health",
  "Travel",
  "Ideas",
  "Projects",
  "Personal",
];

export const DAILY_PROMPT_FALLBACKS = [
  "What made today meaningful?",
  "What challenged you today?",
  "What are you proud of?",
  "What would you improve?",
  "Did you learn something new?",
  "What's weighing on your mind right now?",
  "Who made your day better?",
  "What's one small win from today?",
];

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  return Math.floor(diff / 86_400_000);
}

// Rotates through the fallback list by day-of-year so prompts feel fresh
// without needing an AI call on every page load.
export function fallbackPromptsForToday(count = 3): string[] {
  const offset = dayOfYear(new Date()) % DAILY_PROMPT_FALLBACKS.length;
  const rotated = [
    ...DAILY_PROMPT_FALLBACKS.slice(offset),
    ...DAILY_PROMPT_FALLBACKS.slice(0, offset),
  ];
  return rotated.slice(0, count);
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

// Longest run of consecutive calendar days present in dateKeys (YYYY-MM-DD,
// UTC). Complements habits.ts's computeStreak, which only tracks the
// current run ending today - journal stats need the historical max too.
export function longestStreak(dateKeys: Set<string>): number {
  let longest = 0;
  for (const key of dateKeys) {
    const prevKey = new Date(`${key}T00:00:00.000Z`);
    prevKey.setUTCDate(prevKey.getUTCDate() - 1);
    // Only start counting from a run's first day, so each run is counted once.
    if (dateKeys.has(prevKey.toISOString().slice(0, 10))) continue;

    let run = 1;
    const cursor = new Date(`${key}T00:00:00.000Z`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    while (dateKeys.has(cursor.toISOString().slice(0, 10))) {
      run++;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    longest = Math.max(longest, run);
  }
  return longest;
}

export function humanizeSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return "<1 min";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export type TimelineBucket = "today" | "yesterday" | "lastWeek" | "lastMonth" | "older";

export function timelineBucketFor(date: Date, now = new Date()): TimelineBucket {
  const today = startOfBrisbaneDay(now);
  const target = startOfBrisbaneDay(date);
  const dayMs = 86_400_000;
  const diffDays = Math.round((today.getTime() - target.getTime()) / dayMs);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays <= 7) return "lastWeek";
  if (diffDays <= 31) return "lastMonth";
  return "older";
}

export const TIMELINE_BUCKET_LABELS: Record<TimelineBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  lastWeek: "Last Week",
  lastMonth: "Last Month",
  older: "Older",
};

export function groupByTimelineBucket<T extends { createdAt: Date }>(
  entries: T[],
): { bucket: TimelineBucket; entries: T[] }[] {
  const now = new Date();
  const buckets = new Map<TimelineBucket, T[]>();
  for (const entry of entries) {
    const bucket = timelineBucketFor(entry.createdAt, now);
    const list = buckets.get(bucket) ?? [];
    list.push(entry);
    buckets.set(bucket, list);
  }
  const order: TimelineBucket[] = ["today", "yesterday", "lastWeek", "lastMonth", "older"];
  return order
    .filter((bucket) => buckets.has(bucket))
    .map((bucket) => ({ bucket, entries: buckets.get(bucket)! }));
}
