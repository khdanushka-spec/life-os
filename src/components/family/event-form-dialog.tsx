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
import { createEventAction, updateEventAction } from "@/server/actions/family";
import { FAMILY_EVENT_TYPE_META } from "@/lib/family";
import type { FamilyEventType } from "@/generated/prisma/client";
import type { EventDetail, MemberOption } from "@/components/family/types";

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EventFormBody({
  onOpenChange,
  mode,
  event,
  members,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  event?: EventDetail;
  members: MemberOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(event?.title ?? "");
  const [type, setType] = useState<FamilyEventType>(event?.type ?? "GATHERING");
  const [date, setDate] = useState(toLocalDatetimeValue(event?.date ?? new Date()));
  const [memberId, setMemberId] = useState(event?.memberId ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!date) {
      setError("Date/time is required.");
      return;
    }
    const payload = {
      title: title.trim(),
      type,
      date: new Date(date).toISOString(),
      memberId: memberId || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && event ? await updateEventAction(event.id, payload) : await createEventAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit event" : "Add event"}</DialogTitle>
        <DialogDescription>Anniversaries, holidays, and gatherings.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-title">Title</Label>
          <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FamilyEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FAMILY_EVENT_TYPE_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.icon} {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="event-date">Date & time</Label>
            <Input id="event-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
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
          <Label htmlFor="event-location">Location</Label>
          <Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-notes">Notes</Label>
          <Textarea id="event-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add event"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EventFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  event?: EventDetail;
  members: MemberOption[];
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <EventFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
