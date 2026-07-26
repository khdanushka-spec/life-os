"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TableKit } from "@tiptap/extension-table/kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Check, Loader2, X, AlertCircle } from "lucide-react";
import { JournalEditor } from "@/components/journal/journal-editor";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveDraftNoteAction } from "@/server/actions/vault";
import { VAULT_CATEGORY_PRESETS } from "@/lib/vault";
import type { NoteInitial } from "@/components/vault/types";

const AUTOSAVE_DELAY_MS = 1500;

export function VaultComposer({ initialItem }: { initialItem: NoteInitial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialItem.title);
  const [category, setCategory] = useState(initialItem.category ?? "");
  const [tags, setTags] = useState<string[]>(initialItem.tags);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ title, category, tags });
  useEffect(() => {
    latestRef.current = { title, category, tags };
  }, [title, category, tags]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: true } }),
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: (initialItem.contentJson as object) ?? "",
    editorProps: {
      attributes: { class: "focus:outline-none" },
    },
    onUpdate: () => {
      scheduleSave();
    },
  });

  function scheduleSave() {
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, AUTOSAVE_DELAY_MS);
  }

  async function doSave() {
    if (!editor) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const { title: currentTitle, category: currentCategory, tags: currentTags } = latestRef.current;
    let result;
    try {
      result = await saveDraftNoteAction({
        id: initialItem.id,
        title: currentTitle,
        contentJson: editor.getJSON(),
        contentText: editor.getText(),
        category: currentCategory || null,
        tags: currentTags,
      });
    } catch (err) {
      console.error("Vault note autosave failed:", err);
      setStatus("error");
      return;
    }
    if ("error" in result) {
      if (result.error === "unauthenticated") {
        router.push("/login");
        return;
      }
      console.error("Vault note autosave rejected:", result.error);
      setStatus("error");
      return;
    }
    setStatus("saved");
    router.refresh();
  }

  // Skips the initial mount so opening an existing note doesn't
  // immediately re-save it - same pattern as Journal's composer.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!editor) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, category, tags]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function addTag(tag: string) {
    const clean = tag.trim();
    if (!clean || tags.includes(clean)) return;
    setTags([...tags, clean]);
    setTagInput("");
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled note"
        maxLength={200}
        className="border-none px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : (v as string))}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="No category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {VAULT_CATEGORY_PRESETS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => setTags(tags.filter((t) => t !== tag))}>
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
        {status === "error" && (
          <>
            <AlertCircle className="size-3 text-destructive" /> Couldn&apos;t save — try again
          </>
        )}
      </div>
    </div>
  );
}
