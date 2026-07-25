import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { averageMoodScore, moodForScore } from "@/lib/journal";
import { cn } from "@/lib/utils";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function JournalCalendar({
  userId,
  monthParam,
  selectedDate,
}: {
  userId: string;
  monthParam?: string;
  selectedDate?: string;
}) {
  const [y, m] = (monthParam ?? monthKey(new Date())).split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);
  const prevMonth = new Date(y, m - 2, 1);
  const nextMonth = new Date(y, m, 1);

  const entries = await prisma.journalEntry.findMany({
    where: { userId, createdAt: { gte: monthStart, lt: monthEnd } },
    select: { createdAt: true, mood: true },
  });

  const byDay = new Map<string, { count: number; moods: (typeof entries)[number]["mood"][] }>();
  for (const e of entries) {
    const key = dateKey(e.createdAt);
    const existing = byDay.get(key) ?? { count: 0, moods: [] };
    existing.count++;
    existing.moods.push(e.mood);
    byDay.set(key, existing);
  }

  const totalDays = new Date(y, m, 0).getDate();
  const leadingBlanks = monthStart.getDay();
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const isCurrentMonth = monthKey(new Date()) === monthKey(monthStart);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="size-4 text-primary" />
          {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </CardTitle>
        <div className="flex gap-1">
          <Link
            href={`/journal?month=${monthKey(prevMonth)}`}
            className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </Link>
          <Link
            href={isCurrentMonth ? "#" : `/journal?month=${monthKey(nextMonth)}`}
            aria-disabled={isCurrentMonth}
            className={cn(
              "flex size-6 items-center justify-center rounded-md hover:bg-muted",
              isCurrentMonth && "pointer-events-none opacity-30",
            )}
            aria-label="Next month"
          >
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`blank-${i}`} />;
            const key = dateKey(new Date(y, m - 1, day));
            const data = byDay.get(key);
            const avgScore = data ? averageMoodScore(data.moods) : null;
            const color = avgScore != null ? moodForScore(avgScore).color.light : undefined;
            const selected = selectedDate === key;
            return (
              <Link
                key={key}
                href={selected ? "/journal" : `/journal?date=${key}&month=${monthKey(monthStart)}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-lg border border-transparent text-xs transition-colors hover:border-primary",
                  selected && "border-primary bg-primary/10",
                )}
              >
                <span>{day}</span>
                {data && (
                  <span
                    className="mt-0.5 size-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
