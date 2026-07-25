"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TableKit } from "@tiptap/extension-table/kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Check, Loader2, X } from "lucide-react";
import { JournalEditor } from "@/components/journal/journal-editor";
import { MoodPicker } from "@/components/journal/mood-picker";
import { EnergySlider, type EnergyValues } from "@/components/journal/energy-slider";
import { GratitudeInputs } from "@/components/journal/gratitude-inputs";
import { DailyPrompts } from "@/components/journal/daily-prompts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { saveDraftEntryAction } from "@/server/actions/journal";
import { TAG_SUGGESTIONS } from "@/lib/journal";
import type { JournalEntry, Mood } from "@/generated/prisma/client";

const AUTOSAVE_DELAY_MS = 1500;

export function JournalComposer({
  initialEntry = null,
  promptFallbacks,
}: {
  initialEntry?: JournalEntry | null;
  promptFallbacks: string[];
}) {
  const router = useRouter();
  const [entryId, setEntryId] = useState<string | null>(initialEntry?.id ?? null);
  const [mood, setMood] = useState<Mood | null>(initialEntry?.mood ?? null);
  const [energy, setEnergy] = useState<EnergyValues>({
    morning: initialEntry?.energyMorning ?? null,
    afternoon: initialEntry?.energyAfternoon ?? null,
    evening: initialEntry?.energyEvening ?? null,
  });
  const [gratitude, setGratitude] = useState<string[]>(initialEntry?.gratitude ?? []);
  const [tags, setTags] = useState<string[]>(initialEntry?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const accumulatedSeconds = useRef(0);
  const focusStart = useRef<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ mood, energy, gratitude, tags });
  useEffect(() => {
    latestRef.current = { mood, energy, gratitude, tags };
  }, [mood, energy, gratitude, tags]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: true } }),
      Placeholder.configure({ placeholder: "What's on your mind today?" }),
    ],
    content: (initialEntry?.contentJson as object) ?? "",
    editorProps: {
      attributes: { class: "focus:outline-none" },
    },
    onFocus: () => {
      if (focusStart.current === null) focusStart.current = Date.now();
    },
    onBlur: () => {
      if (focusStart.current !== null) {
        accumulatedSeconds.current += (Date.now() - focusStart.current) / 1000;
        focusStart.current = null;
      }
    },
    onUpdate: () => {
      scheduleSave();
    },
  });

  function currentWritingSeconds(): number {
    const live = focusStart.current !== null ? (Date.now() - focusStart.current) / 1000 : 0;
    return Math.round(accumulatedSeconds.current + live);
  }

  function scheduleSave() {
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, AUTOSAVE_DELAY_MS);
  }

  async function doSave() {
    if (!editor) return;
    const contentText = editor.getText();
    if (contentText.trim().length === 0 && !entryId) {
      setStatus("idle");
      return;
    }
    const { mood, energy, gratitude, tags } = latestRef.current;
    const result = await saveDraftEntryAction({
      id: entryId ?? undefined,
      contentJson: editor.getJSON(),
      contentText,
      mood,
      energyMorning: energy.morning,
      energyAfternoon: energy.afternoon,
      energyEvening: energy.evening,
      gratitude: gratitude.map((g) => g.trim()).filter(Boolean),
      tags,
      writingSeconds: currentWritingSeconds(),
    });
    if (result) {
      setEntryId(result.id);
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("idle");
    }
  }

  // Any structured field (mood/energy/gratitude/tags) also triggers the
  // same debounced save as editor content changes. Skips the initial
  // mount so opening an existing entry doesn't immediately re-save it.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!editor) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, energy, gratitude, tags]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const fallbackPrompts = useMemo(() => promptFallbacks, [promptFallbacks]);

  function insertPrompt(prompt: string) {
    if (!editor) return;
    editor
      .chain()
      .focus("end")
      .insertContent([
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: prompt }] },
        { type: "paragraph" },
      ])
      .run();
  }

  function addTag(tag: string) {
    const clean = tag.trim();
    if (!clean || tags.includes(clean)) return;
    setTags([...tags, clean]);
    setTagInput("");
  }

  return (
    <div className="flex flex-col gap-5">
      <DailyPrompts fallback={fallbackPrompts} onSelect={insertPrompt} />

      <JournalEditor editor={editor} />

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {status === "saving" && (
          <>
            <Loader2 className="size-3 animate-spin" /> Saving…
          </>
        )}
        {status === "saved" && (
          <>
            <Check className="size-3 text-primary" /> Saved
          </>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <MoodPicker value={mood} onChange={setMood} />
        <EnergySlider value={energy} onChange={setEnergy} />
      </div>

      <GratitudeInputs value={gratitude} onChange={setGratitude} />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Tags</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => setTags(tags.filter((t) => t !== tag))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Add a tag"
            className="h-7 w-28"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TAG_SUGGESTIONS.filter((t) => !tags.includes(t)).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addTag(t)}
              className="rounded-full border border-dashed px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              + {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
