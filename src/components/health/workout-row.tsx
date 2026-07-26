"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Clock, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteWorkoutAction } from "@/server/actions/health";
import { WorkoutFormDialog } from "@/components/health/workout-form-dialog";
import type { WorkoutDetail } from "@/components/health/types";
import { cn } from "@/lib/utils";

function formatWorkoutTime(date: Date): string {
  return date.toLocaleString("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WorkoutRow({ workout }: { workout: WorkoutDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium">{workout.type}</span>
        <span className="text-xs text-muted-foreground">{formatWorkoutTime(workout.performedAt)}</span>
        <div className="flex flex-wrap items-center gap-3">
          {workout.durationMinutes != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" /> {workout.durationMinutes} min
            </span>
          )}
          {workout.caloriesBurned != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="size-3" /> {workout.caloriesBurned} cal
            </span>
          )}
        </div>
        {workout.notes && <p className="text-xs text-muted-foreground">{workout.notes}</p>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => startTransition(async () => { await deleteWorkoutAction(workout.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <WorkoutFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" workout={workout} />
    </div>
  );
}
