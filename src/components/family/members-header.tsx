"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberFormDialog } from "@/components/family/member-form-dialog";

export function MembersHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Family Members</h1>
        <p className="text-sm text-muted-foreground">Everyone worth remembering.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Add Member
      </Button>
      <MemberFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
