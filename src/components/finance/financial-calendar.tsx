import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { occurrencesInRange, formatCurrency, decToNumber } from "@/lib/finance";
import { brisbaneDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const dateKey = brisbaneDateKey;

export async function FinancialCalendar({ userId, monthParam }: { userId: string; monthParam?: string }) {
  const [y, m] = (monthParam ?? monthKey(new Date())).split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);
  const prevMonth = new Date(y, m - 2, 1);
  const nextMonth = new Date(y, m, 1);

  const recurring = await prisma.recurringPayment.findMany({ where: { userId, active: true } });

  const byDay = new Map<string, { total: number; names: string[] }>();
  for (const r of recurring) {
    const occurrences = occurrencesInRange(r.nextDueDate, r.interval, monthStart, monthEnd);
    for (const occ of occurrences) {
      const key = dateKey(occ);
      const existing = byDay.get(key) ?? { total: 0, names: [] };
      const amount = decToNumber(r.amount);
      existing.total += r.type === "EXPENSE" ? -amount : amount;
      existing.names.push(r.name);
      byDay.set(key, existing);
    }
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
            href={`/finance?month=${monthKey(prevMonth)}`}
            className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </Link>
          <Link
            href={`/finance?month=${monthKey(nextMonth)}`}
            className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
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
            const isToday = isCurrentMonth && day === Number(brisbaneDateKey().split("-")[2]);
            return (
              <div
                key={key}
                title={data ? `${data.names.join(", ")}: ${formatCurrency(data.total)}` : undefined}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-lg border border-transparent text-xs",
                  isToday && "border-primary bg-primary/10",
                )}
              >
                <span>{day}</span>
                {data && (
                  <span
                    className={cn(
                      "mt-0.5 size-1.5 rounded-full",
                      data.total < 0 ? "bg-destructive" : "bg-emerald-500",
                    )}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
