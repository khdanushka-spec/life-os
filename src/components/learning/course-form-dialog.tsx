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
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCourseAction, updateCourseAction } from "@/server/actions/learning";
import { COURSE_STATUS_META } from "@/lib/learning";
import type { CourseStatus } from "@/generated/prisma/client";
import type { CourseDetail } from "@/components/learning/types";

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function CourseFormBody({
  onOpenChange,
  mode,
  course,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  course?: CourseDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(course?.title ?? "");
  const [provider, setProvider] = useState(course?.provider ?? "");
  const [status, setStatus] = useState<CourseStatus>(course?.status ?? "NOT_STARTED");
  const [progressPercent, setProgressPercent] = useState(course?.progressPercent ?? 0);
  const [startedAt, setStartedAt] = useState(course?.startedAt ? toLocalDateValue(course.startedAt) : "");
  const [completedAt, setCompletedAt] = useState(course?.completedAt ? toLocalDateValue(course.completedAt) : "");
  const [url, setUrl] = useState(course?.url ?? "");
  const [notes, setNotes] = useState(course?.notes ?? "");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const payload = {
      title: title.trim(),
      provider: provider.trim() || null,
      status,
      progressPercent,
      startedAt: startedAt || null,
      completedAt: completedAt || null,
      url: url.trim() || null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && course ? await updateCourseAction(course.id, payload) : await createCourseAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit course" : "Add course"}</DialogTitle>
        <DialogDescription>What you&apos;re learning, and how far along.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-title">Title</Label>
          <Input id="course-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="course-provider">Provider</Label>
            <Input id="course-provider" value={provider} onChange={(e) => setProvider(e.target.value)} maxLength={120} placeholder="Coursera, Udemy…" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CourseStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COURSE_STATUS_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.icon} {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>Progress</Label>
            <span className="text-xs tabular-nums text-muted-foreground">{progressPercent}%</span>
          </div>
          <Slider
            value={[progressPercent]}
            onValueChange={(v) => setProgressPercent(Array.isArray(v) ? v[0] : v)}
            min={0}
            max={100}
            step={5}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="course-started">Started</Label>
            <Input id="course-started" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="course-completed">Completed</Label>
            <Input id="course-completed" type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-url">Link</Label>
          <Input id="course-url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} placeholder="https://…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-notes">Notes</Label>
          <Textarea id="course-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add course"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CourseFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  course?: CourseDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <CourseFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
