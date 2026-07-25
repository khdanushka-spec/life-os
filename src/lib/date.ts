export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // ISO week starting Monday
  d.setDate(d.getDate() + diff);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Recurrence math, originally written for Finance's RecurringPayment and
// now shared with Tasks' repeatInterval - general enough to live here
// rather than in a domain-specific lib.
import type { RecurringInterval } from "@/generated/prisma/client";

// Advances a date by one occurrence of the given interval using calendar
// arithmetic (setMonth/setFullYear) for MONTHLY/QUARTERLY/YEARLY so a
// "due on the 1st" item stays on the 1st indefinitely, rather than
// drifting the way a fixed day-count step would across months of
// different lengths. WEEKLY/FORTNIGHTLY are exact day counts already.
export function advanceByInterval(date: Date, interval: RecurringInterval): Date {
  const next = new Date(date);
  switch (interval) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "FORTNIGHTLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

// All occurrences of a recurring item landing in [rangeStart, rangeEnd),
// walking forward from a reference date (which may be before, inside,
// or after the range).
export function occurrencesInRange(
  referenceDate: Date,
  interval: RecurringInterval,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const occurrences: Date[] = [];
  let cursor = new Date(referenceDate);
  // Guard against a pathological loop if something is misconfigured.
  let iterations = 0;
  while (cursor < rangeStart && iterations < 1000) {
    cursor = advanceByInterval(cursor, interval);
    iterations++;
  }
  while (cursor < rangeEnd && iterations < 2000) {
    if (cursor >= rangeStart) occurrences.push(new Date(cursor));
    cursor = advanceByInterval(cursor, interval);
    iterations++;
  }
  return occurrences;
}
