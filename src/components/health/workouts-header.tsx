"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutFormDialog } from "@/components/health/workout-form-dialog";

export function WorkoutsHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
        <p className="text-sm text-muted-foreground">What you did, and how much.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Log Workout
      </Button>
      <WorkoutFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
