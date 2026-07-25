"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { JournalEntry } from "@/generated/prisma/client";
import { deleteJournalEntryAction } from "@/server/actions/journal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  moodMeta,
  groupByTimelineBucket,
  TIMELINE_BUCKET_LABELS,
  wordCount,
} from "@/lib/journal";

function EntryRow({ entry }: { entry: JournalEntry }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const mood = moodMeta(entry.mood);
  const date = new Date(entry.createdAt);
  const preview =
    entry.contentText.length > 220 ? `${entry.contentText.slice(0, 220)}...` : entry.contentText;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isPending ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col gap-1.5 overflow-hidden rounded-xl border p-3.5"
      style={mood ? { borderLeftColor: mood.color.light, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <Link href={`/journal/${entry.id}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          {mood && <span className="text-sm">{mood.emoji}</span>}
          {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
          {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </Link>
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
      <Link href={`/journal/${entry.id}`}>
        <p className="whitespace-pre-wrap text-sm">{preview || "(empty entry)"}</p>
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        {entry.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">
            {tag}
          </Badge>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {wordCount(entry.contentText)} words
        </span>
      </div>
    </motion.div>
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

  const groups = groupByTimelineBucket(entries);

  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ bucket, entries: bucketEntries }) => (
        <div key={bucket} className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {TIMELINE_BUCKET_LABELS[bucket]}
          </p>
          <div className="flex flex-col gap-2">
            {bucketEntries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
