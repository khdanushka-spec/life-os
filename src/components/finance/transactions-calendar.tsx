import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { decToNumber } from "@/lib/finance";
import { brisbaneDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const dateKey = brisbaneDateKey;

export async function TransactionsCalendar({
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

  const txns = await prisma.transaction.findMany({
    where: { userId, date: { gte: monthStart, lt: monthEnd } },
    select: { date: true, type: true, amount: true, currency: true },
  });

  // netAud stays null until an AUD-currency row lands on that day - a
  // foreign-currency-only day still gets a (neutral) dot for "something
  // happened", but never gets summed into netAud raw, per the
  // cross-currency bug already found in net-worth totals.
  const byDay = new Map<string, { count: number; netAud: number | null }>();
  for (const t of txns) {
    const key = dateKey(t.date);
    const existing = byDay.get(key) ?? { count: 0, netAud: null };
    existing.count++;
    if (t.currency === "AUD") {
      const signed = t.type === "EXPENSE" ? -decToNumber(t.amount) : decToNumber(t.amount);
      existing.netAud = (existing.netAud ?? 0) + signed;
    }
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
            href={`/finance/transactions?month=${monthKey(prevMonth)}`}
            className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </Link>
          <Link
            href={isCurrentMonth ? "#" : `/finance/transactions?month=${monthKey(nextMonth)}`}
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
            const dotClass =
              data?.netAud != null && data.netAud > 0 ? "bg-emerald-500 dark:bg-emerald-400" : "bg-muted-foreground/50";
            const selected = selectedDate === key;
            return (
              <Link
                key={key}
                href={selected ? "/finance/transactions" : `/finance/transactions?date=${key}&month=${monthKey(monthStart)}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-lg border border-transparent text-xs transition-colors hover:border-primary",
                  selected && "border-primary bg-primary/10",
                )}
              >
                <span>{day}</span>
                {data && <span className={cn("mt-0.5 size-1.5 rounded-full", dotClass)} aria-hidden />}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
