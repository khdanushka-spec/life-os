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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createNutritionEntryAction, updateNutritionEntryAction } from "@/server/actions/health";
import { MEAL_TYPE_META } from "@/lib/health";
import type { MealType } from "@/generated/prisma/client";
import type { NutritionDetail } from "@/components/health/types";

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function NutritionFormBody({
  onOpenChange,
  mode,
  entry,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  entry?: NutritionDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>(entry?.mealType ?? "BREAKFAST");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [calories, setCalories] = useState(entry?.calories?.toString() ?? "");
  const [loggedAt, setLoggedAt] = useState(toLocalDatetimeValue(entry?.loggedAt ?? new Date()));

  function handleSubmit() {
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!loggedAt) {
      setError("Date/time is required.");
      return;
    }
    const payload = {
      mealType,
      description: description.trim(),
      calories: calories ? Number(calories) : null,
      loggedAt: new Date(loggedAt).toISOString(),
    };
    startTransition(async () => {
      const result = mode === "edit" && entry ? await updateNutritionEntryAction(entry.id, payload) : await createNutritionEntryAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit meal" : "Log meal"}</DialogTitle>
        <DialogDescription>What you ate, and when.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label>Meal</Label>
          <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MEAL_TYPE_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {meta.icon} {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nutrition-description">Description</Label>
          <Input id="nutrition-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="nutrition-time">Date & time</Label>
            <Input id="nutrition-time" type="datetime-local" value={loggedAt} onChange={(e) => setLoggedAt(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="nutrition-calories">Calories</Label>
            <Input id="nutrition-calories" type="number" min={1} value={calories} onChange={(e) => setCalories(e.target.value)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Log meal"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function NutritionFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  entry?: NutritionDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <NutritionFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
