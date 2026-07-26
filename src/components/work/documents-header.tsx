"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentFormDialog } from "@/components/work/document-form-dialog";
import type { ClientOption } from "@/components/work/types";

export function DocumentsHeader({ projects, clients }: { projects: { id: string; name: string }[]; clients: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">Links and references, organized.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        New Document
      </Button>
      <DocumentFormDialog open={open} onOpenChange={setOpen} mode="create" projects={projects} clients={clients} />
    </div>
  );
}
