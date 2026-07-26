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
import { createDocumentAction, updateDocumentAction } from "@/server/actions/family";
import type { DocumentDetail, MemberOption } from "@/components/family/types";

function DocumentFormBody({
  onOpenChange,
  mode,
  document: doc,
  members,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  document?: DocumentDetail;
  members: MemberOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(doc?.title ?? "");
  const [description, setDescription] = useState(doc?.description ?? "");
  const [url, setUrl] = useState(doc?.url ?? "");
  const [memberId, setMemberId] = useState(doc?.memberId ?? "");
  const [tags, setTags] = useState(doc?.tags.join(", ") ?? "");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      url: url.trim() || null,
      memberId: memberId || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    startTransition(async () => {
      const result = mode === "edit" && doc ? await updateDocumentAction(doc.id, payload) : await createDocumentAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit document" : "New document"}</DialogTitle>
        <DialogDescription>A title and a link - not an upload.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="family-doc-title">Title</Label>
          <Input id="family-doc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="family-doc-url">Link</Label>
          <Input id="family-doc-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." maxLength={2000} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="family-doc-description">Description</Label>
          <Textarea id="family-doc-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={2} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Family member</Label>
          <Select value={memberId || "none"} onValueChange={(v) => setMemberId(v === "none" ? "" : (v as string))}>
            <SelectTrigger>
              <SelectValue placeholder="No one specific" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No one specific</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="family-doc-tags">Tags</Label>
          <Input id="family-doc-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Comma-separated" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add document"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function DocumentFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  document?: DocumentDetail;
  members: MemberOption[];
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <DocumentFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
