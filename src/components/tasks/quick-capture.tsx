"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Loader2 } from "lucide-react";
import { parseQuickCaptureAction, createTaskAction } from "@/server/actions/tasks";
import type { QuickCaptureDraft } from "@/lib/ai/tasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_META } from "@/lib/tasks";
import type { Priority } from "@/generated/prisma/client";

export function QuickCapture() {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<QuickCaptureDraft | null>(null);
  const [isParsing, startParsing] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();

  function parse() {
    if (!text.trim()) return;
    startParsing(async () => {
      const result = await parseQuickCaptureAction(text.trim());
      setDraft(result);
    });
  }

  function save() {
    if (!draft) return;
    startSaving(async () => {
      await createTaskAction({
        title: draft.title,
        dueDate: draft.dueDate
          ? draft.dueTime
            ? `${draft.dueDate}T${draft.dueTime}`
            : draft.dueDate
          : null,
        priority: draft.priority ?? undefined,
        tags: draft.tags,
        estimatedMinutes: draft.estimatedMinutes,
      });
      setText("");
      setDraft(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (draft) setDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft) save();
              else parse();
            }
          }}
          placeholder="What needs your attention?"
          className="h-10 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          disabled={!text.trim() || isParsing}
          onClick={parse}
          aria-label="Parse with AI"
        >
          {isParsing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        </Button>
        {draft && (
          <Button type="button" className="h-10" disabled={isSaving} onClick={save}>
            {isSaving ? "Adding..." : "Add"}
          </Button>
        )}
      </div>
      {draft && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed p-2">
          <span className="text-xs text-muted-foreground">AI parsed:</span>
          <Badge variant="secondary" className="gap-1">
            {draft.title}
            <button type="button" onClick={() => setDraft({ ...draft, title: text.trim() })} aria-label="Reset title">
              <X className="size-3" />
            </button>
          </Badge>
          {draft.dueDate && (
            <Badge variant="secondary" className="gap-1">
              {draft.dueDate}
              {draft.dueTime ? ` ${draft.dueTime}` : ""}
              <button type="button" onClick={() => setDraft({ ...draft, dueDate: null, dueTime: null })} aria-label="Remove date">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {draft.priority && (
            <Badge
              className="gap-1 text-white"
              style={{ backgroundColor: PRIORITY_META[draft.priority as Priority].color }}
            >
              {PRIORITY_META[draft.priority as Priority].label}
              <button type="button" onClick={() => setDraft({ ...draft, priority: null })} aria-label="Remove priority">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {draft.estimatedMinutes && (
            <Badge variant="secondary" className="gap-1">
              {draft.estimatedMinutes}m
              <button type="button" onClick={() => setDraft({ ...draft, estimatedMinutes: null })} aria-label="Remove estimate">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {draft.tags.map((tag, i) => (
            <Badge key={tag} variant="outline" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => setDraft({ ...draft, tags: draft.tags.filter((_, idx) => idx !== i) })}
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
