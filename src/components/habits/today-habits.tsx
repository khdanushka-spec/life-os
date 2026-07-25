import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitRow } from "@/components/habits/habit-row";
import { TIME_OF_DAY_META } from "@/lib/habits";
import type { HabitCategoryOption, HabitWithStats } from "@/components/habits/types";
import type { HabitTimeOfDay } from "@/generated/prisma/client";

const GROUP_ORDER: HabitTimeOfDay[] = ["MORNING", "AFTERNOON", "EVENING", "ANYTIME"];

export function TodayHabits({
  habits,
  categories,
}: {
  habits: HabitWithStats[];
  categories: HabitCategoryOption[];
}) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-base">Today&apos;s Habits</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {habits.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No habits yet — create your first one to get started.
          </p>
        )}
        {GROUP_ORDER.map((group) => {
          const groupHabits = habits.filter((h) => h.timeOfDay === group);
          if (groupHabits.length === 0) return null;
          return (
            <div key={group} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <span>{TIME_OF_DAY_META[group].icon}</span>
                {TIME_OF_DAY_META[group].label}
              </h3>
              <div className="flex flex-col gap-2">
                {groupHabits.map((habit) => (
                  <HabitRow key={habit.id} habit={habit} categories={categories} />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
