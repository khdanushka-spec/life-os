export type WeightPoint = { date: string; weightKg: number };

// Same hand-rolled div-bar approach as Work's HabitSeriesChart/Finance's
// BudgetYearlyChart - no charting library needed at this data volume.
export function WeightTrendChart({ entries }: { entries: WeightPoint[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No weight entries yet.</p>;
  }

  const values = entries.map((e) => e.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <div className="flex h-28 items-end gap-1 overflow-x-auto">
      {entries.map((e) => {
        const heightPercent = 15 + ((e.weightKg - min) / range) * 85;
        return (
          <div key={e.date} className="flex min-w-5 flex-1 flex-col items-end">
            <div
              className="w-full rounded-t-sm bg-rose-500"
              style={{ height: `${heightPercent}%` }}
              title={`${e.date}: ${e.weightKg}kg`}
            />
          </div>
        );
      })}
    </div>
  );
}
