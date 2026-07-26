"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookFormDialog } from "@/components/learning/book-form-dialog";

export function BooksHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Books</h1>
        <p className="text-sm text-muted-foreground">A lightweight reading log.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Add Book
      </Button>
      <BookFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
