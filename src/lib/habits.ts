import { brisbaneDateKey } from "@/lib/date";

// Brisbane's calendar date, not the server's (Vercel runs UTC) - a habit
// toggled at 1am Brisbane time was previously logged against yesterday's
// UTC date, silently "un-completing" the habit once the app's own UTC
// clock caught up hours later.
export function todayDateKey(): string {
  return brisbaneDateKey();
}

// 60 days is plenty for a meaningful streak without pulling full history.
export function habitLogCutoffDate(): Date {
  return new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
}

// Counts consecutive completed days ending today. If today isn't done yet,
// still counts back from yesterday so a streak doesn't visually reset to 0
// before the day is even over.
export function computeStreak(logDateKeys: Set<string>): number {
  let streak = 0;
  const cursor = new Date(`${todayDateKey()}T00:00:00.000Z`);
  const key = () => cursor.toISOString().slice(0, 10);

  if (!logDateKeys.has(key())) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (logDateKeys.has(key())) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
