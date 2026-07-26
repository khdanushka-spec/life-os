import { z } from "zod";
import type { FamilyEventType, GiftIdeaStatus } from "@/generated/prisma/client";

export const RELATIONSHIP_PRESETS = [
  "Parent", "Sibling", "Spouse/Partner", "Child", "Grandparent",
  "Grandchild", "Aunt/Uncle", "Cousin", "Friend", "Other",
];

export const FAMILY_EVENT_TYPE_META: Record<FamilyEventType, { label: string; icon: string }> = {
  ANNIVERSARY: { label: "Anniversary", icon: "💍" },
  HOLIDAY: { label: "Holiday", icon: "🎉" },
  GATHERING: { label: "Gathering", icon: "👨‍👩‍👧‍👦" },
  OTHER: { label: "Other", icon: "📅" },
};

export const GIFT_IDEA_STATUS_META: Record<GiftIdeaStatus, { label: string; icon: string }> = {
  IDEA: { label: "Idea", icon: "💡" },
  PURCHASED: { label: "Purchased", icon: "🛍️" },
  GIVEN: { label: "Given", icon: "🎁" },
};

// Birthdays/anniversaries are stored as a single @db.Date (UTC midnight,
// same convention as MedicalRecord.followUpDate) and recur every year -
// this finds the next occurrence of that month/day from `now`, in UTC to
// match how the date was stored, and returns days until it (0 = today).
export function daysUntilAnnualDate(date: Date, now: Date = new Date()): number {
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let nextUTC = Date.UTC(now.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (nextUTC < todayUTC) nextUTC = Date.UTC(now.getUTCFullYear() + 1, date.getUTCMonth(), date.getUTCDate());
  return Math.round((nextUTC - todayUTC) / 86_400_000);
}

export function splitEventsByTime<T extends { date: Date }>(
  events: T[],
  now: Date = new Date(),
): { upcoming: T[]; past: T[] } {
  const upcoming = events.filter((e) => e.date >= now).sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = events.filter((e) => e.date < now).sort((a, b) => b.date.getTime() - a.date.getTime());
  return { upcoming, past };
}

// The AI only ever fills in these narrative fields - every number in a
// report is computed separately and merged in, same principle as
// Work's/Health's/Learning's reports.
export const familyReportNarrativeSchema = z.object({
  overview: z.string(),
  wins: z.array(z.string()).max(5),
  challenges: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
});
export type FamilyReportNarrative = z.infer<typeof familyReportNarrativeSchema>;

export type FamilyReportSummary = FamilyReportNarrative & {
  eventsInPeriod: number;
  birthdaysInPeriod: number;
  giftsGiven: number;
};
