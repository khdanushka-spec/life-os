"use client";

import { useRef, useState } from "react";
import { StickyNote, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { saveQuickNoteAction } from "@/server/actions/tasks";

const SAVE_DELAY_MS = 1000;

export function QuickNote({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setContent(value);
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await saveQuickNoteAction(value);
      setStatus("saved");
    }, SAVE_DELAY_MS);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <StickyNote className="size-4 text-primary" /> Quick Notes
        </CardTitle>
        {status === "saving" && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        {status === "saved" && <Check className="size-3 text-primary" />}
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Jot something down..."
          className="min-h-24 text-sm"
        />
      </CardContent>
    </Card>
  );
}
