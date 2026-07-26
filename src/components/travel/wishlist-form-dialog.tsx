"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createWishlistDestinationAction, updateWishlistDestinationAction } from "@/server/actions/travel";
import type { WishlistDetail } from "@/components/travel/types";

function WishlistFormBody({
  onOpenChange,
  mode,
  destination: dest,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  destination?: WishlistDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState(dest?.destination ?? "");
  const [country, setCountry] = useState(dest?.country ?? "");
  const [starred, setStarred] = useState(dest?.starred ?? false);
  const [notes, setNotes] = useState(dest?.notes ?? "");

  function handleSubmit() {
    if (!destination.trim()) {
      setError("Destination is required.");
      return;
    }
    const payload = {
      destination: destination.trim(),
      country: country.trim() || null,
      starred,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result =
        mode === "edit" && dest ? await updateWishlistDestinationAction(dest.id, payload) : await createWishlistDestinationAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit destination" : "Add destination"}</DialogTitle>
        <DialogDescription>Somewhere you want to go, someday.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="wishlist-destination">Destination</Label>
            <Input id="wishlist-destination" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={120} autoFocus />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="wishlist-country">Country</Label>
            <Input id="wishlist-country" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="wishlist-starred" className="text-sm font-normal">
            Top of mind
          </Label>
          <Switch id="wishlist-starred" checked={starred} onCheckedChange={setStarred} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wishlist-notes">Notes</Label>
          <Textarea id="wishlist-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add destination"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function WishlistFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  destination?: WishlistDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <WishlistFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
