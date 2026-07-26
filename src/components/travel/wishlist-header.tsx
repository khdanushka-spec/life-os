"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WishlistFormDialog } from "@/components/travel/wishlist-form-dialog";

export function WishlistHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
        <p className="text-sm text-muted-foreground">Somewhere you want to go, someday.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Add Destination
      </Button>
      <WishlistFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
