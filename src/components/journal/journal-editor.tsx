"use client";

import type { Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListChecks,
  Quote,
  Code,
  Table as TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function JournalEditor({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex flex-col gap-1">
      {editor && (
        <BubbleMenu editor={editor} className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md">
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Checklist"
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <ListChecks className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Code block"
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Table"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableIcon className="size-3.5" />
          </ToolbarButton>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className="journal-prose min-h-40" />
    </div>
  );
}
