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
import { createMemberAction, updateMemberAction } from "@/server/actions/family";
import { RELATIONSHIP_PRESETS } from "@/lib/family";
import type { MemberDetail } from "@/components/family/types";

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function MemberFormBody({
  onOpenChange,
  mode,
  member,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  member?: MemberDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(member?.name ?? "");
  const relationshipPreset = member?.relationship && RELATIONSHIP_PRESETS.includes(member.relationship) ? member.relationship : member?.relationship ? "Other" : "";
  const [relationship, setRelationship] = useState(relationshipPreset);
  const [customRelationship, setCustomRelationship] = useState(relationshipPreset === "Other" ? (member?.relationship ?? "") : "");
  const [birthday, setBirthday] = useState(member?.birthday ? toLocalDateValue(member.birthday) : "");
  const [photoUrl, setPhotoUrl] = useState(member?.photoUrl ?? "");
  const [notes, setNotes] = useState(member?.notes ?? "");

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const finalRelationship = relationship === "Other" ? customRelationship.trim() : relationship;
    const payload = {
      name: name.trim(),
      relationship: finalRelationship || null,
      birthday: birthday || null,
      photoUrl: photoUrl.trim() || null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && member ? await updateMemberAction(member.id, payload) : await createMemberAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit family member" : "Add family member"}</DialogTitle>
        <DialogDescription>Who they are, and how to celebrate them.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-name">Name</Label>
          <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Relationship</Label>
            <Select value={relationship || "none"} onValueChange={(v) => setRelationship(v === "none" ? "" : (v as string))}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {RELATIONSHIP_PRESETS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="member-birthday">Birthday</Label>
            <Input id="member-birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </div>
        </div>
        {relationship === "Other" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="member-custom-relationship">Custom relationship</Label>
            <Input id="member-custom-relationship" value={customRelationship} onChange={(e) => setCustomRelationship(e.target.value)} maxLength={60} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-photo">Photo link</Label>
          <Input id="member-photo" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} maxLength={2000} placeholder="https://…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-notes">Notes</Label>
          <Textarea id="member-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add member"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function MemberFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  member?: MemberDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <MemberFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
