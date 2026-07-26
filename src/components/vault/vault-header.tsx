"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createEmptyNoteAction } from "@/server/actions/vault";
import { LinkFormDialog } from "@/components/vault/link-form-dialog";

export function VaultHeader() {
  const router = useRouter();
  const [linkOpen, setLinkOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleNewNote() {
    startTransition(async () => {
      const item = await createEmptyNoteAction();
      router.push(`/vault/${item.id}`);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Vault</h1>
        <p className="text-sm text-muted-foreground">Notes and links, saved and searchable.</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setLinkOpen(true)} className="gap-1.5">
          <Link2 className="size-4" />
          New Link
        </Button>
        <Button type="button" onClick={handleNewNote} disabled={isPending} className="gap-1.5">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <FilePlus className="size-4" />}
          New Note
        </Button>
      </div>
      <LinkFormDialog open={linkOpen} onOpenChange={setLinkOpen} mode="create" />
    </div>
  );
}
