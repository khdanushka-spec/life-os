"use client";

import { Plus } from "lucide-react";
import { createTaskAction } from "@/server/actions/tasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewTaskForm() {
  return (
    <form
      action={async (formData) => {
        await createTaskAction(formData);
      }}
      className="flex gap-2"
    >
      <Input
        name="title"
        placeholder="Add a task..."
        required
        maxLength={280}
        className="flex-1"
      />
      <Input name="dueDate" type="date" className="w-40" />
      <Button type="submit" size="icon" aria-label="Add task">
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
