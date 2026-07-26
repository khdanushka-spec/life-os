"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentFormDialog } from "@/components/family/document-form-dialog";
import type { MemberOption } from "@/components/family/types";

export function DocumentsHeader({ members }: { members: MemberOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">Important records, linked not uploaded.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Add Document
      </Button>
      <DocumentFormDialog open={open} onOpenChange={setOpen} mode="create" members={members} />
    </div>
  );
}
