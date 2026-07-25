"use client";

import { Plus } from "lucide-react";
import { createHabitAction } from "@/server/actions/habits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewHabitForm() {
  return (
    <form
      action={async (formData) => {
        await createHabitAction(formData);
      }}
      className="flex gap-2"
    >
      <Input
        name="title"
        placeholder="Add a habit, e.g. Drink water"
        required
        maxLength={140}
        className="flex-1"
      />
      <Button type="submit" size="icon" aria-label="Add habit">
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
