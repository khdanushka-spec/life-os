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
import { createDocumentAction, updateDocumentAction } from "@/server/actions/work";
import type { ClientOption } from "@/components/work/types";

export type DocumentDetail = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  projectId: string | null;
  clientId: string | null;
  tags: string[];
};

type ProjectOption = { id: string; name: string };

function DocumentFormBody({
  onOpenChange,
  mode,
  document: doc,
  projects,
  clients,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  document?: DocumentDetail;
  projects: ProjectOption[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(doc?.title ?? "");
  const [description, setDescription] = useState(doc?.description ?? "");
  const [url, setUrl] = useState(doc?.url ?? "");
  const [projectId, setProjectId] = useState(doc?.projectId ?? "");
  const [clientId, setClientId] = useState(doc?.clientId ?? "");
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
      projectId: projectId || null,
      clientId: clientId || null,
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
          <Label htmlFor="doc-title">Title</Label>
          <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-url">Link</Label>
          <Input id="doc-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." maxLength={2000} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-description">Description</Label>
          <Textarea id="doc-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={2} />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Project</Label>
            <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : (v as string))}>
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Client</Label>
            <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : (v as string))}>
              <SelectTrigger>
                <SelectValue placeholder="No client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-tags">Tags</Label>
          <Input id="doc-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Comma-separated" />
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
  projects: ProjectOption[];
  clients: ClientOption[];
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <DocumentFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
