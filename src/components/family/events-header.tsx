"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventFormDialog } from "@/components/family/event-form-dialog";
import type { MemberOption } from "@/components/family/types";

export function EventsHeader({ members }: { members: MemberOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">Anniversaries, holidays, and gatherings.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Add Event
      </Button>
      <EventFormDialog open={open} onOpenChange={setOpen} mode="create" members={members} />
    </div>
  );
}
