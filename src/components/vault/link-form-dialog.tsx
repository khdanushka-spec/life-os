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
import { createLinkAction, updateLinkAction } from "@/server/actions/vault";
import { VAULT_CATEGORY_PRESETS } from "@/lib/vault";
import type { LinkDetail } from "@/components/vault/types";

function LinkFormBody({
  onOpenChange,
  mode,
  link,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  link?: LinkDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(link?.title ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [description, setDescription] = useState(link?.contentText ?? "");
  const [category, setCategory] = useState(link?.category ?? "");
  const [tags, setTags] = useState(link?.tags.join(", ") ?? "");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!url.trim()) {
      setError("URL is required.");
      return;
    }
    const payload = {
      title: title.trim(),
      url: url.trim(),
      contentText: description.trim(),
      category: category || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    startTransition(async () => {
      const result = mode === "edit" && link ? await updateLinkAction(link.id, payload) : await createLinkAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit link" : "Save a link"}</DialogTitle>
        <DialogDescription>Bookmark something worth keeping.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="link-title">Title</Label>
          <Input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="link-url">URL</Label>
          <Input id="link-url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} placeholder="https://…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="link-description">Description</Label>
          <Textarea id="link-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : (v as string))}>
              <SelectTrigger>
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
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="link-tags">Tags</Label>
            <Input id="link-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Comma-separated" />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Save link"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function LinkFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  link?: LinkDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <LinkFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
