import type { SeriesPoint } from "@/lib/habits";

// Single-series % bar chart (weekly/monthly completion rate), same
// hand-rolled div-bar approach as Finance's BudgetYearlyChart - no
// charting library needed for a single series at this data volume.
export function HabitSeriesChart({ data, color }: { data: SeriesPoint[]; color: string }) {
  return (
    <div className="flex h-32 items-end gap-1.5 overflow-x-auto">
      {data.map((point, i) => (
        <div key={`${point.label}-${i}`} className="flex min-w-8 flex-1 flex-col items-center gap-1">
          <div className="flex h-full w-full items-end">
            <div
              className="w-full rounded-t-sm transition-[height]"
              style={{ height: `${Math.max(2, point.percent)}%`, backgroundColor: color }}
              title={`${point.label}: ${point.percent}%`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{point.label}</span>
        </div>
      ))}
    </div>
  );
}
