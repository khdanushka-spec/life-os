"use client";

import { useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Check, Loader2 } from "lucide-react";
import { JournalEditor } from "@/components/journal/journal-editor";
import { updateTaskAction } from "@/server/actions/tasks";

const SAVE_DELAY_MS = 1200;

export function TaskDescriptionEditor({
  taskId,
  initialJson,
}: {
  taskId: string;
  initialJson: unknown;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Add notes..." }),
    ],
    content: (initialJson as object) ?? "",
    editorProps: { attributes: { class: "focus:outline-none" } },
    onUpdate: ({ editor }) => {
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await updateTaskAction(taskId, {
          descriptionJson: editor.getJSON(),
          descriptionText: editor.getText(),
        });
        setStatus("saved");
      }, SAVE_DELAY_MS);
    },
  });

  return (
    <div className="flex flex-col gap-1">
      <JournalEditor editor={editor} />
      <div className="flex h-4 items-center gap-1 text-[11px] text-muted-foreground">
        {status === "saving" && (
          <>
            <Loader2 className="size-3 animate-spin" /> Saving...
          </>
        )}
        {status === "saved" && (
          <>
            <Check className="size-3 text-primary" /> Saved
          </>
        )}
      </div>
    </div>
  );
}
