"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setHabitNoteAction } from "@/server/actions/habits";

// Body is only mounted while open, so each open is a fresh mount seeded
// with the current note - avoids syncing stale state back in via an
// effect (this dialog's parent never unmounts it between opens).
function QuickNoteBody({
  onOpenChange,
  habitId,
  habitTitle,
  currentNote,
}: {
  onOpenChange: (open: boolean) => void;
  habitId: string;
  habitTitle: string;
  currentNote: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState(currentNote ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await setHabitNoteAction(habitId, note);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Note for {habitTitle}</DialogTitle>
        <DialogDescription>Attached to today&apos;s entry.</DialogDescription>
      </DialogHeader>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="How did it go?"
        maxLength={500}
        rows={4}
        autoFocus
      />
      <DialogFooter>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save note"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function QuickNoteDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitId: string;
  habitTitle: string;
  currentNote: string | null;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <QuickNoteBody {...props} />}</DialogContent>
    </Dialog>
  );
}
