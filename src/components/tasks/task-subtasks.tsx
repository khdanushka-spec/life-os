"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Task } from "@/generated/prisma/client";
import { createTaskAction, updateTaskStatusAction, deleteTaskAction } from "@/server/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TaskSubtasks({ parentId, subtasks }: { parentId: string; subtasks: Task[] }) {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function addSubtask() {
    const clean = title.trim();
    if (!clean) return;
    startTransition(async () => {
      await createTaskAction({ title: clean, parentId });
      setTitle("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {subtasks.map((sub) => (
        <div key={sub.id} className={cn("flex items-center gap-2", isPending && "opacity-60")}>
          <Checkbox
            checked={sub.status === "DONE"}
            onCheckedChange={(checked) =>
              startTransition(async () => {
                await updateTaskStatusAction(sub.id, checked ? "DONE" : "TODO");
                router.refresh();
              })
            }
          />
          <span className={cn("flex-1 text-sm", sub.status === "DONE" && "text-muted-foreground line-through")}>
            {sub.title}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete subtask"
            onClick={() =>
              startTransition(async () => {
                await deleteTaskAction(sub.id);
                router.refresh();
              })
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSubtask();
            }
          }}
          placeholder="Add a subtask"
          className="h-8"
        />
        <Button size="icon-sm" variant="outline" onClick={addSubtask} aria-label="Add subtask">
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
