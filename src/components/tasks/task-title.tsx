"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskAction } from "@/server/actions/tasks";

export function TaskTitle({ taskId, initialTitle }: { taskId: string; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    const clean = title.trim();
    if (!clean || clean === initialTitle) {
      setTitle(clean || initialTitle);
      return;
    }
    startTransition(async () => {
      await updateTaskAction(taskId, { title: clean });
      router.refresh();
    });
  }

  return (
    <textarea
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={save}
      rows={1}
      className="w-full resize-none border-none bg-transparent text-2xl font-semibold tracking-tight outline-none"
    />
  );
}
