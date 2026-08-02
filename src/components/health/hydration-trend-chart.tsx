import { WATER_GOAL_ML } from "@/lib/health";

export type HydrationPoint = { date: string; waterMl: number };

// Same hand-rolled div-bar approach as WeightTrendChart, but scaled from
// zero against the daily goal (not min/max of the data) since the point
// here is "did you hit 2000ml," not relative day-to-day fluctuation.
export function HydrationTrendChart({ entries }: { entries: HydrationPoint[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No water intake logged yet.</p>;
  }

  const max = Math.max(WATER_GOAL_ML, ...entries.map((e) => e.waterMl));

  return (
    <div className="flex h-28 items-end gap-1 overflow-x-auto">
      {entries.map((e) => {
        const heightPercent = Math.max(4, (e.waterMl / max) * 100);
        const metGoal = e.waterMl >= WATER_GOAL_ML;
        return (
          <div key={e.date} className="flex min-w-5 flex-1 flex-col items-end">
            <div
              className={`w-full rounded-t-sm ${metGoal ? "bg-sky-500" : "bg-sky-500/40"}`}
              style={{ height: `${heightPercent}%` }}
              title={`${e.date}: ${e.waterMl}ml`}
            />
          </div>
        );
      })}
    </div>
  );
}
