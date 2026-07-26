"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWorkoutAction, updateWorkoutAction } from "@/server/actions/health";
import { WORKOUT_TYPE_PRESETS } from "@/lib/health";
import type { WorkoutDetail } from "@/components/health/types";

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function WorkoutFormBody({
  onOpenChange,
  mode,
  workout,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  workout?: WorkoutDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const presetType = workout && WORKOUT_TYPE_PRESETS.includes(workout.type) ? workout.type : workout ? "Other" : WORKOUT_TYPE_PRESETS[0];
  const [type, setType] = useState(presetType);
  const [customType, setCustomType] = useState(presetType === "Other" ? (workout?.type ?? "") : "");
  const [performedAt, setPerformedAt] = useState(toLocalDatetimeValue(workout?.performedAt ?? new Date()));
  const [durationMinutes, setDurationMinutes] = useState(workout?.durationMinutes?.toString() ?? "");
  const [caloriesBurned, setCaloriesBurned] = useState(workout?.caloriesBurned?.toString() ?? "");
  const [notes, setNotes] = useState(workout?.notes ?? "");

  function handleSubmit() {
    const finalType = type === "Other" ? customType.trim() : type;
    if (!finalType) {
      setError("Type is required.");
      return;
    }
    if (!performedAt) {
      setError("Date/time is required.");
      return;
    }
    const payload = {
      type: finalType,
      performedAt: new Date(performedAt).toISOString(),
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      caloriesBurned: caloriesBurned ? Number(caloriesBurned) : null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && workout ? await updateWorkoutAction(workout.id, payload) : await createWorkoutAction(payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit workout" : "Log workout"}</DialogTitle>
        <DialogDescription>What you did, and how it went.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as string)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPE_PRESETS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {type === "Other" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workout-custom-type">Custom type</Label>
            <Input id="workout-custom-type" value={customType} onChange={(e) => setCustomType(e.target.value)} maxLength={60} autoFocus />
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="workout-time">Date & time</Label>
            <Input id="workout-time" type="datetime-local" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="workout-duration">Duration (min)</Label>
            <Input id="workout-duration" type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workout-calories">Calories burned</Label>
          <Input id="workout-calories" type="number" min={1} value={caloriesBurned} onChange={(e) => setCaloriesBurned(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workout-notes">Notes</Label>
          <Textarea id="workout-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Log workout"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function WorkoutFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  workout?: WorkoutDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <WorkoutFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
