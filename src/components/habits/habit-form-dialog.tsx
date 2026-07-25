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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createHabitAction, updateHabitAction, createHabitCategoryAction } from "@/server/actions/habits";
import {
  HABIT_ICON_OPTIONS,
  HABIT_COLOR_OPTIONS,
  WEEKDAY_SHORT,
  TIME_OF_DAY_META,
  SCHEDULE_META,
  GOAL_TYPE_META,
  DIFFICULTY_META,
  PRIORITY_META,
} from "@/lib/habits";
import type { HabitCategoryOption, HabitWithStats } from "@/components/habits/types";
import type {
  HabitDifficulty,
  HabitGoalType,
  HabitPriority,
  HabitSchedule,
  HabitTimeOfDay,
} from "@/generated/prisma/client";

const STEPS = ["General", "Schedule", "Goal", "Reminder", "Motivation"] as const;

function emptyState(habit?: HabitWithStats) {
  return {
    title: habit?.title ?? "",
    description: habit?.description ?? "",
    icon: habit?.icon ?? "✨",
    color: habit?.color ?? "#6366f1",
    categoryId: habit?.category?.id ?? "",
    timeOfDay: (habit?.timeOfDay ?? "ANYTIME") as HabitTimeOfDay,
    schedule: (habit?.schedule ?? "DAILY") as HabitSchedule,
    customDays: habit?.customDays ?? ([] as number[]),
    goalType: (habit?.goalType ?? "ONCE") as HabitGoalType,
    targetCount: habit?.targetCount?.toString() ?? "",
    targetUnit: habit?.targetUnit ?? "",
    estimatedMinutes: habit?.estimatedMinutes?.toString() ?? "",
    difficulty: (habit?.difficulty ?? "MEDIUM") as HabitDifficulty,
    priority: (habit?.priority ?? "MEDIUM") as HabitPriority,
    motivation: habit?.motivation ?? "",
    reward: habit?.reward ?? "",
    reminderEnabled: habit?.reminderEnabled ?? false,
    reminderTime: habit?.reminderTime ?? "08:00",
    reminderSound: true,
  };
}

// Only mounted while the dialog is open (see HabitFormDialog below), so
// every open is a fresh mount seeded from the current habit/categories -
// avoids syncing stale state back in via an effect.
function HabitFormBody({
  onOpenChange,
  mode,
  habit,
  categories,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  habit?: HabitWithStats;
  categories: HabitCategoryOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyState(habit));
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(HABIT_COLOR_OPTIONS[0]);
  const [createdCategories, setCreatedCategories] = useState<HabitCategoryOption[]>([]);
  const localCategories = [...categories, ...createdCategories.filter((c) => !categories.some((existing) => existing.id === c.id))];

  function set<K extends keyof ReturnType<typeof emptyState>>(key: K, value: ReturnType<typeof emptyState>[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCustomDay(day: number) {
    set("customDays", form.customDays.includes(day) ? form.customDays.filter((d) => d !== day) : [...form.customDays, day].sort());
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const category = await createHabitCategoryAction({ name: newCategoryName.trim(), color: newCategoryColor });
      setCreatedCategories((prev) => (prev.some((c) => c.id === category.id) ? prev : [...prev, category]));
      set("categoryId", category.id);
      setAddingCategory(false);
      setNewCategoryName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create category.");
    }
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      setError("Name is required.");
      setStep(0);
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("title", form.title);
    formData.set("description", form.description);
    formData.set("icon", form.icon);
    formData.set("color", form.color);
    formData.set("categoryId", form.categoryId);
    formData.set("timeOfDay", form.timeOfDay);
    formData.set("schedule", form.schedule);
    for (const day of form.customDays) formData.append("customDays", String(day));
    formData.set("goalType", form.goalType);
    if (form.targetCount) formData.set("targetCount", form.targetCount);
    if (form.targetUnit) formData.set("targetUnit", form.targetUnit);
    if (form.estimatedMinutes) formData.set("estimatedMinutes", form.estimatedMinutes);
    formData.set("difficulty", form.difficulty);
    formData.set("priority", form.priority);
    formData.set("motivation", form.motivation);
    formData.set("reward", form.reward);
    formData.set("reminderEnabled", String(form.reminderEnabled));
    if (form.reminderTime) formData.set("reminderTime", form.reminderTime);
    formData.set("reminderSound", String(form.reminderSound));

    startTransition(async () => {
      const result =
        mode === "edit" && habit
          ? await updateHabitAction(habit.id, {}, formData)
          : await createHabitAction({}, formData);

      if (result?.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit habit" : "New habit"}</DialogTitle>
        <DialogDescription>
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </DialogDescription>
      </DialogHeader>

        <div className="flex gap-1.5">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Go to ${label} step`}
              className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
          {step === 0 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-title">Name</Label>
                <Input
                  id="habit-title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Morning Reading"
                  maxLength={140}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-description">Description</Label>
                <Textarea
                  id="habit-description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Optional details about this habit"
                  maxLength={500}
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-1.5">
                  {HABIT_ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => set("icon", icon)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg border text-lg transition-colors hover:bg-muted",
                        form.icon === icon && "border-primary bg-primary/10",
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-1.5">
                  {HABIT_COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={color}
                      onClick={() => set("color", color)}
                      className={cn(
                        "size-7 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                        form.color === color && "ring-2 ring-foreground",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                {!addingCategory ? (
                  <div className="flex gap-2">
                    <Select
                      value={form.categoryId || "none"}
                      onValueChange={(v) => set("categoryId", v === "none" ? "" : (v as string))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="No category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {localCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.icon} {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={() => setAddingCategory(true)}>
                      New
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex gap-2">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name"
                        maxLength={30}
                      />
                      <Button type="button" size="sm" onClick={handleCreateCategory}>
                        Add
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setAddingCategory(false)}>
                        Cancel
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {HABIT_COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={color}
                          onClick={() => setNewCategoryColor(color)}
                          className={cn(
                            "size-6 rounded-full ring-offset-2 ring-offset-background",
                            newCategoryColor === color && "ring-2 ring-foreground",
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Repeat</Label>
                <Select value={form.schedule} onValueChange={(v) => set("schedule", v as HabitSchedule)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SCHEDULE_META) as HabitSchedule[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {SCHEDULE_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.schedule === "CUSTOM" && (
                <div className="flex flex-col gap-1.5">
                  <Label>Which days</Label>
                  <div className="flex gap-1.5">
                    {WEEKDAY_SHORT.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleCustomDay(i)}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full border text-xs font-medium transition-colors hover:bg-muted",
                          form.customDays.includes(i) && "border-primary bg-primary/10",
                        )}
                      >
                        {label[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label>Time of day</Label>
                <Select value={form.timeOfDay} onValueChange={(v) => set("timeOfDay", v as HabitTimeOfDay)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIME_OF_DAY_META) as HabitTimeOfDay[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIME_OF_DAY_META[t].icon} {TIME_OF_DAY_META[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Goal</Label>
                <Select value={form.goalType} onValueChange={(v) => set("goalType", v as HabitGoalType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GOAL_TYPE_META) as HabitGoalType[]).map((g) => (
                      <SelectItem key={g} value={g}>
                        {GOAL_TYPE_META[g].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.goalType === "MULTIPLE" && (
                <div className="flex gap-2">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="target-count">Target count</Label>
                    <Input
                      id="target-count"
                      type="number"
                      min={1}
                      value={form.targetCount}
                      onChange={(e) => set("targetCount", e.target.value)}
                      placeholder="8"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="target-unit">Measurement</Label>
                    <Input
                      id="target-unit"
                      value={form.targetUnit}
                      onChange={(e) => set("targetUnit", e.target.value)}
                      placeholder="glasses"
                      maxLength={30}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimated-minutes">
                  {form.goalType === "DURATION" ? "Target duration (minutes)" : "Estimated duration (minutes)"}
                </Label>
                <Input
                  id="estimated-minutes"
                  type="number"
                  min={1}
                  max={1440}
                  value={form.estimatedMinutes}
                  onChange={(e) => set("estimatedMinutes", e.target.value)}
                  placeholder="20"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Reminder</p>
                  <p className="text-xs text-muted-foreground">Show this habit in your daily reminders.</p>
                </div>
                <Switch checked={form.reminderEnabled} onCheckedChange={(v) => set("reminderEnabled", v)} />
              </div>
              {form.reminderEnabled && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reminder-time">Time</Label>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={form.reminderTime}
                      onChange={(e) => set("reminderTime", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-sm font-medium">Sound</p>
                    <Switch checked={form.reminderSound} onCheckedChange={(v) => set("reminderSound", v)} />
                  </div>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="motivation">Why this matters</Label>
                <Textarea
                  id="motivation"
                  value={form.motivation}
                  onChange={(e) => set("motivation", e.target.value)}
                  placeholder="What's driving this habit?"
                  maxLength={500}
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reward">Reward</Label>
                <Input
                  id="reward"
                  value={form.reward}
                  onChange={(e) => set("reward", e.target.value)}
                  placeholder="How you'll celebrate progress"
                  maxLength={200}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>Difficulty</Label>
                  <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v as HabitDifficulty)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DIFFICULTY_META) as HabitDifficulty[]).map((d) => (
                        <SelectItem key={d} value={d}>
                          {DIFFICULTY_META[d].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => set("priority", v as HabitPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_META) as HabitPriority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_META[p].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {isLastStep ? (
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create habit"}
            </Button>
          ) : (
            <Button type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              Next
            </Button>
          )}
        </DialogFooter>
    </>
  );
}

export function HabitFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  habit?: HabitWithStats;
  categories: HabitCategoryOption[];
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <HabitFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
