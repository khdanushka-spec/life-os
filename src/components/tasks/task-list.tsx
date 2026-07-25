"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Task } from "@/generated/prisma/client";
import { toggleTaskAction, deleteTaskAction } from "@/server/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDueDate(date: Date | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function TaskRow({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const done = task.status === "DONE";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        isPending && "opacity-60",
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            await toggleTaskAction(task.id, checked);
            router.refresh();
          })
        }
      />
      <div className="flex-1">
        <p className={cn("text-sm", done && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        {task.dueDate && (
          <p className="text-xs text-muted-foreground">
            Due {formatDueDate(task.dueDate)}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete task"
        onClick={() =>
          startTransition(async () => {
            await deleteTaskAction(task.id);
            router.refresh();
          })
        }
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  const pending = tasks.filter((t) => t.status !== "DONE");
  const done = tasks.filter((t) => t.status === "DONE");

  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No tasks yet — add your first one above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {pending.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
      {done.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Completed ({done.length})
          </p>
          {done.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
