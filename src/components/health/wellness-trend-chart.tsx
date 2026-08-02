export type WellnessPoint = { date: string; score: number };

// Same hand-rolled div-bar approach as the other health trend charts. The
// wellness score is already 0-100, so it scales from a fixed 0-100 range
// rather than the data's own min/max or a goal value.
export function WellnessTrendChart({ entries }: { entries: WellnessPoint[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough logged data yet to chart a trend.</p>;
  }

  return (
    <div className="flex h-28 items-end gap-1 overflow-x-auto">
      {entries.map((e) => (
        <div key={e.date} className="flex min-w-5 flex-1 flex-col items-end">
          <div
            className="w-full rounded-t-sm bg-rose-500"
            style={{ height: `${Math.max(4, e.score)}%` }}
            title={`${e.date}: ${e.score}%`}
          />
        </div>
      ))}
    </div>
  );
}
