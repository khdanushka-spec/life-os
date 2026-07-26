import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";

export type WorkoutSummary = {
  id: string;
  type: string;
  performedAt: Date;
  durationMinutes: number | null;
};

export function RecentWorkouts({ workouts }: { workouts: WorkoutSummary[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Recent Workouts</CardTitle>
        <Link href="/health/workouts" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {workouts.length === 0 && <p className="text-sm text-muted-foreground">No workouts logged yet.</p>}
        {workouts.map((w) => (
          <div key={w.id} className="flex items-center gap-2 text-sm">
            <Dumbbell className="size-3.5 shrink-0 text-emerald-500" />
            <span className="flex-1 truncate">{w.type}</span>
            <span className="text-xs text-muted-foreground">
              {w.performedAt.toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short" })}
              {w.durationMinutes ? ` · ${w.durationMinutes}m` : ""}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
