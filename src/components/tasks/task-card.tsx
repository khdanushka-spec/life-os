"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Bell, ListChecks, MessageSquare, Pin } from "lucide-react";
import type { Task, Project } from "@/generated/prisma/client";
import { updateTaskStatusAction, togglePinnedAction } from "@/server/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_META, ENERGY_META, computeProgress } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export type TaskCardData = Task & {
  project: Project | null;
  subtasks: { status: Task["status"] }[];
  _count: { comments: number };
};

function formatDue(date: Date): { label: string; overdue: boolean } {
  const d = new Date(date);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000);
  const time = d.getHours() !== 0 || d.getMinutes() !== 0
    ? ` ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : "";
  if (days === 0) return { label: `Today${time}`, overdue: false };
  if (days === -1) return { label: `Yesterday${time}`, overdue: true };
  if (days < -1) return { label: `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}${time}`, overdue: true };
  if (days === 1) return { label: `Tomorrow${time}`, overdue: false };
  return { label: `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}${time}`, overdue: false };
}

export function TaskCard({ task }: { task: TaskCardData }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const done = task.status === "DONE";
  const due = task.dueDate ? formatDue(task.dueDate) : null;
  const progress = computeProgress(task.subtasks, task.progressPercent);
  const priorityMeta = PRIORITY_META[task.priority];
  const energyMeta = task.energy ? ENERGY_META[task.energy] : null;
  const completedSubtasks = task.subtasks.filter((s) => s.status === "DONE").length;

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-2xl border bg-card/60 p-3.5 backdrop-blur transition-colors hover:border-primary/40",
        isPending && "opacity-60",
        done && "opacity-60",
      )}
    >
      <Checkbox
        checked={done}
        className="mt-0.5"
        onCheckedChange={(checked) =>
          startTransition(async () => {
            await updateTaskStatusAction(task.id, checked ? "DONE" : "TODO");
            router.refresh();
          })
        }
      />
      <Link href={`/tasks/${task.id}`} className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>
            {task.title}
          </p>
          <span
            className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: priorityMeta.color }}
          >
            {priorityMeta.label}
          </span>
        </div>
        {task.descriptionText && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.descriptionText}</p>
        )}
        {progress != null && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {due && (
            <Badge variant={due.overdue && !done ? "destructive" : "secondary"} className="text-[10px]">
              {due.label}
            </Badge>
          )}
          {task.project && (
            <span className="flex items-center gap-1 rounded-full border px-2 py-0.5">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: task.project.color }} />
              {task.project.name}
            </span>
          )}
          {task.estimatedMinutes && <span>{task.estimatedMinutes}m</span>}
          {energyMeta && <span className={cn("size-2 rounded-full", energyMeta.opacityClass)} title={energyMeta.label} />}
          {task.subtasks.length > 0 && (
            <span className="flex items-center gap-0.5">
              <ListChecks className="size-3" /> {completedSubtasks}/{task.subtasks.length}
            </span>
          )}
          {task._count.comments > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="size-3" /> {task._count.comments}
            </span>
          )}
          {task.repeatInterval && <Repeat className="size-3" />}
          {task.reminderAt && <Bell className="size-3" />}
          {task.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </Link>
      <button
        type="button"
        aria-label={task.pinned ? "Unpin" : "Pin"}
        onClick={() =>
          startTransition(async () => {
            await togglePinnedAction(task.id, !task.pinned);
            router.refresh();
          })
        }
        className={cn(
          "absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100",
          task.pinned && "opacity-100",
        )}
      >
        <Pin className={cn("size-3.5", task.pinned ? "fill-primary text-primary" : "text-muted-foreground")} />
      </button>
    </div>
  );
}
