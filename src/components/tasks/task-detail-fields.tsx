"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Task, Project, Priority, EnergyLevel, RecurringInterval, TaskStatus } from "@/generated/prisma/client";
import { updateTaskAction, updateTaskStatusAction } from "@/server/actions/tasks";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PRIORITY_META, ENERGY_META } from "@/lib/tasks";

const REPEAT_LABELS: Record<RecurringInterval, string> = {
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

function toLocalDateTimeInput(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function TaskDetailFields({
  task,
  projects,
}: {
  task: Task;
  projects: Project[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState(task.tags);

  function save(patch: Parameters<typeof updateTaskAction>[1]) {
    startTransition(async () => {
      await updateTaskAction(task.id, patch);
      router.refresh();
    });
  }

  function addTag(tag: string) {
    const clean = tag.trim();
    if (!clean || tags.includes(clean)) return;
    const next = [...tags, clean];
    setTags(next);
    setTagInput("");
    save({ tags: next });
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    save({ tags: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Status</Label>
        <Select
          value={task.status}
          onValueChange={(v) =>
            startTransition(async () => {
              await updateTaskStatusAction(task.id, v as TaskStatus);
              router.refresh();
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["TODO", "IN_PROGRESS", "WAITING", "SOMEDAY", "DONE"] as const).map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Priority</Label>
        <Select value={task.priority} onValueChange={(v) => save({ priority: v as Priority })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRIORITY_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {task.aiSuggestedPriority && task.aiSuggestedPriority !== task.priority && (
          <button
            type="button"
            onClick={() => save({ priority: task.aiSuggestedPriority! })}
            className="text-left text-[11px] text-muted-foreground hover:text-primary"
          >
            AI suggests {PRIORITY_META[task.aiSuggestedPriority].label} - apply?
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Energy</Label>
        <Select
          value={task.energy ?? "none"}
          onValueChange={(v) => save({ energy: v === "none" ? null : (v as EnergyLevel) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {Object.entries(ENERGY_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-due">Due</Label>
        <Input
          id="task-due"
          type="datetime-local"
          defaultValue={toLocalDateTimeInput(task.dueDate)}
          onChange={(e) => save({ dueDate: e.target.value || null })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-estimate">Estimated minutes</Label>
        <Input
          id="task-estimate"
          type="number"
          min="1"
          defaultValue={task.estimatedMinutes ?? ""}
          onBlur={(e) => save({ estimatedMinutes: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Project</Label>
        <Select
          value={task.projectId ?? "none"}
          onValueChange={(v) => save({ projectId: v === "none" ? null : (v as string) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No project</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Repeat</Label>
        <Select
          value={task.repeatInterval ?? "none"}
          onValueChange={(v) => save({ repeatInterval: v === "none" ? null : (v as RecurringInterval) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Doesn&apos;t repeat</SelectItem>
            {Object.entries(REPEAT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Tags</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Add tag"
            className="h-7 w-24"
          />
        </div>
      </div>
    </div>
  );
}
