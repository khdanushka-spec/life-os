"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingFormDialog } from "@/components/work/meeting-form-dialog";
import type { ClientOption } from "@/components/work/types";

export function MeetingsHeader({ projects, clients }: { projects: { id: string; name: string }[]; clients: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <p className="text-sm text-muted-foreground">What happened, and what&apos;s next.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Log Meeting
      </Button>
      <MeetingFormDialog open={open} onOpenChange={setOpen} mode="create" projects={projects} clients={clients} />
    </div>
  );
}
