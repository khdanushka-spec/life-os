"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJournalEntryAction } from "@/server/actions/journal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MOODS } from "@/lib/journal";
import type { Mood } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

export function NewEntryForm() {
  const [mood, setMood] = useState<Mood | null>(null);
  const [content, setContent] = useState("");
  const router = useRouter();

  return (
    <form
      action={async (formData) => {
        if (mood) formData.set("mood", mood);
        await createJournalEntryAction(formData);
        setContent("");
        setMood(null);
        router.refresh();
      }}
      className="flex flex-col gap-3"
    >
      <Textarea
        name="content"
        placeholder="What's on your mind today?"
        required
        maxLength={5000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-label={m.label}
              aria-pressed={mood === m.value}
              onClick={() => setMood(mood === m.value ? null : m.value)}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg border border-transparent text-lg transition-colors hover:bg-muted",
                mood === m.value && "border-primary bg-primary/10",
              )}
            >
              {m.emoji}
            </button>
          ))}
        </div>
        <Button type="submit" size="sm">
          Save entry
        </Button>
      </div>
    </form>
  );
}
