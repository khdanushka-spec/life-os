"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBookAction, updateBookAction } from "@/server/actions/learning";
import { BOOK_STATUS_META } from "@/lib/learning";
import type { BookStatus } from "@/generated/prisma/client";
import type { BookDetail } from "@/components/learning/types";
import { cn } from "@/lib/utils";

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function StarRating({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n === value ? 0 : n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
          <Star className={cn("size-5 transition-colors", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}

function BookFormBody({
  onOpenChange,
  mode,
  book,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  book?: BookDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [status, setStatus] = useState<BookStatus>(book?.status ?? "WANT_TO_READ");
  const [currentPage, setCurrentPage] = useState(book?.currentPage?.toString() ?? "");
  const [totalPages, setTotalPages] = useState(book?.totalPages?.toString() ?? "");
  const [rating, setRating] = useState(book?.rating ?? 0);
  const [startedAt, setStartedAt] = useState(book?.startedAt ? toLocalDateValue(book.startedAt) : "");
  const [finishedAt, setFinishedAt] = useState(book?.finishedAt ? toLocalDateValue(book.finishedAt) : "");
  const [notes, setNotes] = useState(book?.notes ?? "");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const payload = {
      title: title.trim(),
      author: author.trim() || null,
      status,
      currentPage: currentPage ? Number(currentPage) : null,
      totalPages: totalPages ? Number(totalPages) : null,
      rating: rating > 0 ? rating : null,
      startedAt: startedAt || null,
      finishedAt: finishedAt || null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && book ? await updateBookAction(book.id, payload) : await createBookAction(payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit book" : "Add book"}</DialogTitle>
        <DialogDescription>What you&apos;re reading, and how far along.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="book-title">Title</Label>
          <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="book-author">Author</Label>
            <Input id="book-author" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BookStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BOOK_STATUS_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.icon} {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="book-current-page">Current page</Label>
            <Input id="book-current-page" type="number" min={0} value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="book-total-pages">Total pages</Label>
            <Input id="book-total-pages" type="number" min={1} value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Rating</Label>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="book-started">Started</Label>
            <Input id="book-started" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="book-finished">Finished</Label>
            <Input id="book-finished" type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="book-notes">Notes</Label>
          <Textarea id="book-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add book"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function BookFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  book?: BookDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <BookFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
