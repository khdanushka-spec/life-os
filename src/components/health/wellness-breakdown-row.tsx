export function WellnessBreakdownRow({ label, weightPercent, percent }: { label: string; weightPercent: number; percent: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>
          {label} <span className="text-muted-foreground">({weightPercent}% weight)</span>
        </span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-rose-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
