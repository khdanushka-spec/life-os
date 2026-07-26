"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/work/project-form-dialog";
import type { ClientOption } from "@/components/work/types";

export function WorkHeader({ clients }: { clients: ClientOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Work</h1>
        <p className="text-sm text-muted-foreground">Projects, clients, and deadlines in one place.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        New Project
      </Button>
      <ProjectFormDialog open={open} onOpenChange={setOpen} mode="create" clients={clients} />
    </div>
  );
}
