import { SLEEP_GOAL_HOURS } from "@/lib/health";

export type SleepPoint = { date: string; sleepHours: number };

// Same approach as HydrationTrendChart — scaled from zero against the
// 8h goal rather than the data's own min/max.
export function SleepTrendChart({ entries }: { entries: SleepPoint[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No sleep logged yet.</p>;
  }

  const max = Math.max(SLEEP_GOAL_HOURS, ...entries.map((e) => e.sleepHours));

  return (
    <div className="flex h-28 items-end gap-1 overflow-x-auto">
      {entries.map((e) => {
        const heightPercent = Math.max(4, (e.sleepHours / max) * 100);
        const metGoal = e.sleepHours >= SLEEP_GOAL_HOURS;
        return (
          <div key={e.date} className="flex min-w-5 flex-1 flex-col items-end">
            <div
              className={`w-full rounded-t-sm ${metGoal ? "bg-indigo-500" : "bg-indigo-500/40"}`}
              style={{ height: `${heightPercent}%` }}
              title={`${e.date}: ${e.sleepHours}h`}
            />
          </div>
        );
      })}
    </div>
  );
}
