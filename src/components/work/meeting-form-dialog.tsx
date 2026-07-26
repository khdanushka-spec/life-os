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
import { createMeetingAction, updateMeetingAction } from "@/server/actions/work";
import type { ClientOption } from "@/components/work/types";

export type MeetingDetail = {
  id: string;
  title: string;
  projectId: string | null;
  clientId: string | null;
  startTime: Date;
  durationMinutes: number | null;
  location: string | null;
  attendees: string[];
  notes: string | null;
};

type ProjectOption = { id: string; name: string };

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function MeetingFormBody({
  onOpenChange,
  mode,
  meeting,
  projects,
  clients,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  meeting?: MeetingDetail;
  projects: ProjectOption[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [projectId, setProjectId] = useState(meeting?.projectId ?? "");
  const [clientId, setClientId] = useState(meeting?.clientId ?? "");
  const [startTime, setStartTime] = useState(toLocalDatetimeValue(meeting?.startTime ?? new Date()));
  const [durationMinutes, setDurationMinutes] = useState(meeting?.durationMinutes?.toString() ?? "30");
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [attendees, setAttendees] = useState(meeting?.attendees.join(", ") ?? "");
  const [notes, setNotes] = useState(meeting?.notes ?? "");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!startTime) {
      setError("Date/time is required.");
      return;
    }
    const payload = {
      title: title.trim(),
      projectId: projectId || null,
      clientId: clientId || null,
      startTime: new Date(startTime).toISOString(),
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      location: location.trim() || null,
      attendees: attendees
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && meeting ? await updateMeetingAction(meeting.id, payload) : await createMeetingAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit meeting" : "Log meeting"}</DialogTitle>
        <DialogDescription>A record of what happened or will happen.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meeting-title">Title</Label>
          <Input id="meeting-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="meeting-time">Date & time</Label>
            <Input id="meeting-time" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="meeting-duration">Duration (min)</Label>
            <Input id="meeting-duration" type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
          </div>
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
          <Label htmlFor="meeting-location">Location / link</Label>
          <Input id="meeting-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meeting-attendees">Attendees</Label>
          <Input
            id="meeting-attendees"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="Comma-separated names"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meeting-notes">Notes</Label>
          <Textarea id="meeting-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Log meeting"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function MeetingFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  meeting?: MeetingDetail;
  projects: ProjectOption[];
  clients: ClientOption[];
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <MeetingFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
