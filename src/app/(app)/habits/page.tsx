import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewHabitForm } from "@/components/habits/new-habit-form";
import { HabitList, type HabitWithStatus } from "@/components/habits/habit-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { computeStreak, habitLogCutoffDate, todayDateKey } from "@/lib/habits";

export default async function HabitsPage() {
  const dbUser = await requireDbUser();
  const habits = await prisma.habit.findMany({
    where: { userId: dbUser.id, archived: false },
    orderBy: { createdAt: "asc" },
    include: {
      logs: {
        where: { date: { gte: habitLogCutoffDate() } },
      },
    },
  });

  const today = todayDateKey();
  const habitsWithStatus: HabitWithStatus[] = habits.map((habit) => {
    const dateKeys = new Set(
      habit.logs.map((log) => log.date.toISOString().slice(0, 10)),
    );
    return {
      id: habit.id,
      title: habit.title,
      doneToday: dateKeys.has(today),
      streak: computeStreak(dateKeys),
    };
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Habits</CardTitle>
          <CardDescription>Small daily wins, tracked honestly.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <NewHabitForm />
          <HabitList habits={habitsWithStatus} />
        </CardContent>
      </Card>
    </div>
  );
}
