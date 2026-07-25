type HistoryEntry = { dateKey: string; value: number | null; note: string | null };

export function HabitHistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No completions logged yet.</p>;
  }

  return (
    <div className="flex max-h-72 flex-col divide-y overflow-y-auto">
      {entries.map((entry) => (
        <div key={entry.dateKey} className="flex items-start justify-between gap-3 py-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {new Date(`${entry.dateKey}T00:00:00Z`).toLocaleDateString("en-AU", {
                timeZone: "UTC",
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            {entry.note && <span className="text-xs text-muted-foreground">{entry.note}</span>}
          </div>
          {entry.value != null && <span className="text-xs text-muted-foreground">{entry.value}</span>}
        </div>
      ))}
    </div>
  );
}
