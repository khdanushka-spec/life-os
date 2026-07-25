"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatusAction } from "@/server/actions/tasks";
import { TaskCard, type TaskCardData } from "@/components/tasks/task-card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { TaskStatus } from "@/generated/prisma/client";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "TODO", label: "Todo" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "WAITING", label: "Waiting" },
  { status: "SOMEDAY", label: "Someday" },
  { status: "DONE", label: "Done" },
];

function StatusMover({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Select
      value={status}
      onValueChange={(v) =>
        startTransition(async () => {
          await updateTaskStatusAction(taskId, v as TaskStatus);
          router.refresh();
        })
      }
    >
      <SelectTrigger className="h-6 w-full text-[11px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COLUMNS.map((c) => (
          <SelectItem key={c.status} value={c.status}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TaskBoard({ tasks }: { tasks: TaskCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="flex flex-col gap-2">
            <p className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
              {col.label}
              <span>{items.length}</span>
            </p>
            <div className="flex flex-col gap-2">
              {items.map((task) => (
                <div key={task.id} className="flex flex-col gap-1.5">
                  <TaskCard task={task} />
                  <StatusMover taskId={task.id} status={task.status} />
                </div>
              ))}
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Nothing here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
