import { cn } from "@/lib/utils";

export type HeatmapDay = {
  dateKey: string;
  status: "completed" | "missed" | "not-scheduled" | "before-creation";
  note: string | null;
  isToday: boolean;
};

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function statusClass(status: HeatmapDay["status"]): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "missed":
      return "bg-muted-foreground/25";
    case "not-scheduled":
      return "bg-muted/40";
    case "before-creation":
      return "bg-transparent";
  }
}

function formatTitle(day: HeatmapDay): string {
  const date = new Date(`${day.dateKey}T00:00:00Z`).toLocaleDateString("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const statusLabel =
    day.status === "completed" ? "Completed" : day.status === "missed" ? "Missed" : "Not scheduled";
  return [date, statusLabel, day.note].filter(Boolean).join(" — ");
}

// GitHub-style contribution graph: weeks as columns, Sun-Sat as rows,
// covering the given days (expected to be a contiguous run ending today).
export function CalendarHeatmap({ days }: { days: HeatmapDay[] }) {
  if (days.length === 0) return null;

  // Pad the front so the first column starts on a Sunday.
  const firstWeekday = new Date(`${days[0].dateKey}T00:00:00Z`).getUTCDay();
  const padded: (HeatmapDay | null)[] = [...Array(firstWeekday).fill(null), ...days];
  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <div className="flex flex-col gap-1 pt-4 text-[10px] text-muted-foreground">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="flex h-3 items-center">
            {label}
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) =>
              day ? (
                <div
                  key={di}
                  title={formatTitle(day)}
                  className={cn(
                    "size-3 rounded-sm transition-transform hover:scale-125",
                    statusClass(day.status),
                    day.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                  )}
                />
              ) : (
                <div key={di} className="size-3" />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
