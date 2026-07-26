export type StudyMinutesPoint = { date: string; minutes: number };

// Same hand-rolled div-bar approach as Health's WeightTrendChart - no
// charting library needed at this data volume.
export function StudyMinutesChart({ entries }: { entries: StudyMinutesPoint[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No study sessions logged yet.</p>;
  }

  const max = Math.max(...entries.map((e) => e.minutes), 1);

  return (
    <div className="flex h-28 items-end gap-1 overflow-x-auto">
      {entries.map((e) => {
        const heightPercent = e.minutes === 0 ? 2 : 10 + (e.minutes / max) * 90;
        return (
          <div key={e.date} className="flex min-w-5 flex-1 flex-col items-end">
            <div
              className="w-full rounded-t-sm bg-violet-500"
              style={{ height: `${heightPercent}%` }}
              title={`${e.date}: ${e.minutes} min`}
            />
          </div>
        );
      })}
    </div>
  );
}
