import Link from "next/link";
import { NotebookPen, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { moodMeta } from "@/lib/journal";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// "Related" here means same-day context (the task's due date) rather than
// an explicit link field - a lightweight, honest interpretation that
// still surfaces genuinely relevant Journal/Habits data without a new
// relation the schema doesn't have.
export async function TaskRelated({ userId, dueDate }: { userId: string; dueDate: Date | null }) {
  if (!dueDate) return null;
  const dayStart = startOfDay(dueDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [journalEntries, habits] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId, createdAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.habit.findMany({
      where: { userId, archived: false },
      include: { logs: { where: { date: dayStart } } },
    }),
  ]);

  if (journalEntries.length === 0 && habits.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          On {dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {journalEntries.map((e) => {
          const mood = moodMeta(e.mood);
          return (
            <Link key={e.id} href={`/journal/${e.id}`} className="flex items-center gap-2 text-xs hover:text-primary">
              <NotebookPen className="size-3.5 shrink-0 text-muted-foreground" />
              {mood && <span>{mood.emoji}</span>}
              <span className="truncate">{e.contentText || "(empty entry)"}</span>
            </Link>
          );
        })}
        {habits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {habits.map((h) => (
              <span
                key={h.id}
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
              >
                <Flame className={h.logs.length > 0 ? "size-3 text-primary" : "size-3 text-muted-foreground"} />
                {h.title}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
