import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Same month-grid pattern as the Journal and Finance calendars, this
// time dotting days that have a task due.
export function MiniCalendar({ dueDates }: { dueDates: Date[] }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const byDay = new Set(dueDates.map(dateKey));

  const totalDays = new Date(y, m + 1, 0).getDate();
  const leadingBlanks = new Date(y, m, 1).getDay();
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarDays className="size-4 text-primary" />
          {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`blank-${i}`} />;
            const key = dateKey(new Date(y, m, day));
            const hasDue = byDay.has(key);
            const isToday = day === now.getDate();
            return (
              <Link
                key={key}
                href={`/tasks?list=today`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-md text-[10px]",
                  isToday && "bg-primary/10 font-medium text-primary",
                )}
              >
                {day}
                {hasDue && <span className="mt-0.5 size-1 rounded-full bg-primary" aria-hidden />}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
