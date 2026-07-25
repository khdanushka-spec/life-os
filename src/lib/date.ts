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

// For <input type="date"> defaultValues in Client Components - uses the
// browser's own local date components (not .toISOString(), which forces
// UTC and shows yesterday's date as the default for part of the day in
// any timezone ahead of UTC, Brisbane included).
export function localDateInputValue(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// The app is Brisbane-based (see lib/weather.ts) but server code (Vercel
// serverless) runs in UTC, so a plain startOfDay() draws the "today"
// boundary ~10h too early/late for a Brisbane user. Queensland never
// observes daylight saving, so +10:00 is safe to hardcode rather than
// doing full IANA-timezone arithmetic.
const BRISBANE_UTC_OFFSET = "+10:00";

export function brisbaneDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function startOfBrisbaneDay(date: Date = new Date()): Date {
  return new Date(`${brisbaneDateKey(date)}T00:00:00${BRISBANE_UTC_OFFSET}`);
}

// Brisbane's current hour (0-23), for time-of-day logic like greeting text.
// Server code runs in UTC, so a plain date.getHours() is up to 10h off.
export function brisbaneHour(date: Date = new Date()): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Brisbane",
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
  return hour % 24; // some ICU implementations format midnight as "24"
}

// For @db.Date columns (HabitLog.date, the AI-cache "date" columns, etc.)
// and for date-key equality checks - NOT the same value as
// startOfBrisbaneDay(). This returns a Date whose *UTC* calendar-day
// components equal Brisbane's calendar date, so storing it in a
// date-only column (or reading it back via .toISOString().slice(0,10))
// round-trips to the correct Brisbane day. startOfBrisbaneDay() instead
// returns the actual instant of Brisbane midnight (correct for filtering
// real DateTime columns like dueDate/completedAt by range) - the two are
// ~10h apart and are not interchangeable.
export function brisbaneToday(date: Date = new Date()): Date {
  return new Date(`${brisbaneDateKey(date)}T00:00:00.000Z`);
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
