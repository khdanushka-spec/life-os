"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Trash2 } from "lucide-react";
import { toggleHabitTodayAction, deleteHabitAction } from "@/server/actions/habits";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type HabitWithStatus = {
  id: string;
  title: string;
  doneToday: boolean;
  streak: number;
};

function HabitRow({ habit }: { habit: HabitWithStatus }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        isPending && "opacity-60",
      )}
    >
      <Checkbox
        checked={habit.doneToday}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            await toggleHabitTodayAction(habit.id, checked);
            router.refresh();
          })
        }
      />
      <span className="flex-1 text-sm">{habit.title}</span>
      {habit.streak > 0 && (
        <Badge variant="secondary" className="gap-1">
          <Flame className="size-3" />
          {habit.streak}
        </Badge>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete habit"
        onClick={() =>
          startTransition(async () => {
            await deleteHabitAction(habit.id);
            router.refresh();
          })
        }
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function HabitList({ habits }: { habits: HabitWithStatus[] }) {
  if (habits.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No habits yet — add your first one above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {habits.map((habit) => (
        <HabitRow key={habit.id} habit={habit} />
      ))}
    </div>
  );
}
