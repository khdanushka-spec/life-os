"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { JournalEntry } from "@/generated/prisma/client";
import { deleteJournalEntryAction } from "@/server/actions/journal";
import { Button } from "@/components/ui/button";
import { moodMeta } from "@/lib/journal";
import { cn } from "@/lib/utils";

function EntryRow({ entry }: { entry: JournalEntry }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const mood = moodMeta(entry.mood);
  const date = new Date(entry.createdAt);

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border p-3",
        isPending && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {mood && <span className="text-sm">{mood.emoji}</span>}
          {date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}{" "}
          &middot;{" "}
          {date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete entry"
          onClick={() =>
            startTransition(async () => {
              await deleteJournalEntryAction(entry.id);
              router.refresh();
            })
          }
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <p className="whitespace-pre-wrap text-sm">{entry.content}</p>
    </div>
  );
}

export function EntryList({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No entries yet — write your first one above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
