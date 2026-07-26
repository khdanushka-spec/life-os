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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGiftIdeaAction, updateGiftIdeaAction } from "@/server/actions/family";
import { GIFT_IDEA_STATUS_META } from "@/lib/family";
import type { GiftIdeaStatus } from "@/generated/prisma/client";
import type { GiftIdeaDetail, MemberOption } from "@/components/family/types";

function GiftIdeaFormBody({
  onOpenChange,
  mode,
  giftIdea,
  members,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  giftIdea?: GiftIdeaDetail;
  members: MemberOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [memberId, setMemberId] = useState(giftIdea?.memberId ?? members[0]?.id ?? "");
  const [title, setTitle] = useState(giftIdea?.title ?? "");
  const [occasion, setOccasion] = useState(giftIdea?.occasion ?? "");
  const [price, setPrice] = useState(giftIdea?.price?.toString() ?? "");
  const [url, setUrl] = useState(giftIdea?.url ?? "");
  const [status, setStatus] = useState<GiftIdeaStatus>(giftIdea?.status ?? "IDEA");
  const [notes, setNotes] = useState(giftIdea?.notes ?? "");

  function handleSubmit() {
    if (!memberId) {
      setError("A family member is required.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const payload = {
      memberId,
      title: title.trim(),
      occasion: occasion.trim() || null,
      price: price ? Number(price) : null,
      url: url.trim() || null,
      status,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && giftIdea ? await updateGiftIdeaAction(giftIdea.id, payload) : await createGiftIdeaAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit gift idea" : "Add gift idea"}</DialogTitle>
        <DialogDescription>Something to remember for next time.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label>For</Label>
          <Select value={memberId} onValueChange={(v) => setMemberId(v as string)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a family member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gift-title">Title</Label>
          <Input id="gift-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="gift-occasion">Occasion</Label>
            <Input id="gift-occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} maxLength={120} placeholder="Birthday, Christmas…" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="gift-price">Price</Label>
            <Input id="gift-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as GiftIdeaStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GIFT_IDEA_STATUS_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.icon} {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="gift-url">Link</Label>
            <Input id="gift-url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} placeholder="https://…" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gift-notes">Notes</Label>
          <Textarea id="gift-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add gift idea"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function GiftIdeaFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  giftIdea?: GiftIdeaDetail;
  members: MemberOption[];
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <GiftIdeaFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
