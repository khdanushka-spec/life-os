"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiftIdeaFormDialog } from "@/components/family/gift-idea-form-dialog";
import type { MemberOption } from "@/components/family/types";

export function GiftsHeader({ members }: { members: MemberOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gift Ideas</h1>
        <p className="text-sm text-muted-foreground">Something to remember for next time.</p>
      </div>
      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground">Add a family member first.</p>
      ) : (
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Add Gift Idea
        </Button>
      )}
      <GiftIdeaFormDialog open={open} onOpenChange={setOpen} mode="create" members={members} />
    </div>
  );
}
