"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import type { HabitCategoryOption } from "@/components/habits/types";

export function HabitsHeader({ categories }: { categories: HabitCategoryOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
        <p className="text-sm text-muted-foreground">Small actions. Extraordinary results.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        New Habit
      </Button>
      <HabitFormDialog open={open} onOpenChange={setOpen} mode="create" categories={categories} />
    </div>
  );
}
