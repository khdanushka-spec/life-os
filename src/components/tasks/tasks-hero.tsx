import { AlertCircle, CheckCircle2, ListChecks, Sparkles, Target, TrendingUp } from "lucide-react";
import { greeting } from "@/lib/greeting";
import type { FocusScoreBreakdown } from "@/lib/tasks";

type StatColor = "primary" | "success" | "warning" | "destructive" | "neutral";

const COLOR_CLASSES: Record<StatColor, { text: string; iconBg: string; icon: string }> = {
  primary: { text: "text-primary", iconBg: "bg-primary/10", icon: "text-primary" },
  success: { text: "text-success", iconBg: "bg-success/10", icon: "text-success" },
  warning: { text: "text-warning", iconBg: "bg-warning/10", icon: "text-warning" },
  destructive: { text: "text-destructive", iconBg: "bg-destructive/10", icon: "text-destructive" },
  neutral: { text: "text-foreground", iconBg: "bg-muted", icon: "text-muted-foreground" },
};

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

  const stats: { label: string; value: string | number; icon: typeof Target; color: StatColor }[] = [
    { label: "Focus Score", value: `${focusScore.score}%`, icon: Target, color: "primary" },
    { label: "Today's Tasks", value: dueTodayCount, icon: ListChecks, color: "neutral" },
    { label: "Completed", value: completedTodayCount, icon: CheckCircle2, color: "success" },
    {
      label: "Overdue",
      value: overdueCount,
      icon: AlertCircle,
      color: overdueCount > 0 ? "destructive" : "neutral",
    },
    { label: "Weekly Progress", value: `${weeklyCompletionPercent}%`, icon: TrendingUp, color: "primary" },
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
            {today.toLocaleDateString("en-AU", {
              timeZone: "Australia/Brisbane",
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => {
            const colors = COLOR_CLASSES[s.color];
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex flex-col gap-2 rounded-2xl border bg-background/50 p-3"
              >
                <div className={`flex size-7 items-center justify-center rounded-lg ${colors.iconBg}`}>
                  <Icon className={`size-3.5 ${colors.icon}`} />
                </div>
                <div>
                  <p className={`text-xl font-semibold tabular-nums ${colors.text}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Everything important in one place.
        </p>
      </div>
    </div>
  );
}
