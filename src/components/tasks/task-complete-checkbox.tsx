"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatusAction } from "@/server/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskStatus } from "@/generated/prisma/client";

export function TaskCompleteCheckbox({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Checkbox
      checked={status === "DONE"}
      disabled={isPending}
      className="mt-2"
      onCheckedChange={(checked) =>
        startTransition(async () => {
          await updateTaskStatusAction(taskId, checked ? "DONE" : "TODO");
          router.refresh();
        })
      }
    />
  );
}
