import { brisbaneDateKey } from "@/lib/date";

const WEEKS = 12;

// GitHub-style contribution grid: WEEKS columns x 7 rows, most recent
// week last. Reuses the same "bucket by day, color by count" idea as
// the month-grid calendars, laid out as columns instead since a heatmap
// reads better as a continuous strip than a single month. Keys must be
// Brisbane calendar days to line up with completionsByDay's keys (see
// lib/tasks.ts), which are also Brisbane-keyed.
export function TaskHeatmap({ completionsByDay }: { completionsByDay: Map<string, number> }) {
  const today = new Date();
  const days: { key: string; count: number }[] = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = brisbaneDateKey(d);
    days.push({ key, count: completionsByDay.get(key) ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.count));

  function opacity(count: number): number {
    if (count === 0) return 0;
    return 0.25 + (count / max) * 0.75;
  }

  const columns: { key: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));

  return (
    <div className="flex gap-1 overflow-x-auto">
      {columns.map((col, i) => (
        <div key={i} className="flex flex-col gap-1">
          {col.map((d) => (
            <div
              key={d.key}
              title={`${d.key}: ${d.count} completed`}
              className="size-3 rounded-sm bg-primary"
              style={{ opacity: opacity(d.count) || undefined, backgroundColor: d.count === 0 ? "var(--muted)" : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
