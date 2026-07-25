"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Send } from "lucide-react";
import type { Comment } from "@/generated/prisma/client";
import { addCommentAction, deleteCommentAction } from "@/server/actions/tasks";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function TaskComments({ taskId, comments }: { taskId: string; comments: Comment[] }) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    const clean = body.trim();
    if (!clean) return;
    startTransition(async () => {
      await addCommentAction({ taskId, body: clean });
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg border p-2.5">
          <div>
            <p className="text-sm">{c.body}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {new Date(c.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete comment"
            onClick={() =>
              startTransition(async () => {
                await deleteCommentAction(c.id);
                router.refresh();
              })
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-16"
        />
        <Button size="icon" variant="outline" onClick={submit} disabled={isPending} aria-label="Send comment">
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
