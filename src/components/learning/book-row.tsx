"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteBookAction } from "@/server/actions/learning";
import { BookFormDialog } from "@/components/learning/book-form-dialog";
import { BOOK_STATUS_META } from "@/lib/learning";
import type { BookDetail } from "@/components/learning/types";
import { cn } from "@/lib/utils";

export function BookRow({ book }: { book: BookDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const meta = BOOK_STATUS_META[book.status];
  const progressPercent = book.currentPage != null && book.totalPages ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100)) : null;

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            {meta.icon} {meta.label}
          </Badge>
          {book.rating != null && (
            <span className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn("size-3", n <= book.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
              ))}
            </span>
          )}
        </div>
        <div>
          <span className="text-sm font-medium">{book.title}</span>
          {book.author && <span className="text-xs text-muted-foreground"> by {book.author}</span>}
        </div>
        {progressPercent != null && (
          <div className="flex items-center gap-2">
            <Progress value={progressPercent} className="flex-1" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {book.currentPage}/{book.totalPages}
            </span>
          </div>
        )}
        {book.notes && <p className="text-xs text-muted-foreground">{book.notes}</p>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => startTransition(async () => { await deleteBookAction(book.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BookFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" book={book} />
    </div>
  );
}
