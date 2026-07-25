import { Sparkles } from "lucide-react";
import { greeting } from "@/lib/greeting";
import type { FocusScoreBreakdown } from "@/lib/tasks";

export function TasksHero({
  name,
  focusScore,
  dueTodayCount,
  overdueCount,
  completedTodayCount,
  weeklyCompletionPercent,
}: {
  name: string;
  focusScore: FocusScoreBreakdown;
  dueTodayCount: number;
  overdueCount: number;
  completedTodayCount: number;
  weeklyCompletionPercent: number;
}) {
  const today = new Date();

  const stats = [
    { label: "Focus Score", value: `${focusScore.score}%` },
    { label: "Today's Tasks", value: dueTodayCount },
    { label: "Completed", value: completedTodayCount },
    { label: "Overdue", value: overdueCount },
    { label: "Weekly Progress", value: `${weeklyCompletionPercent}%` },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card/60 p-6 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
      />
      <div className="relative flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {name}.
          </h1>
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border bg-background/50 p-3">
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Everything important in one place.
        </p>
      </div>
    </div>
  );
}
