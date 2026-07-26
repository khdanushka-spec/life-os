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
import { createMedicalRecordAction, updateMedicalRecordAction } from "@/server/actions/health";
import { MEDICAL_RECORD_TYPE_META } from "@/lib/health";
import type { MedicalRecordType } from "@/generated/prisma/client";
import type { MedicalRecordDetail } from "@/components/health/types";

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function MedicalRecordFormBody({
  onOpenChange,
  mode,
  record,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  record?: MedicalRecordDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<MedicalRecordType>(record?.type ?? "APPOINTMENT");
  const [title, setTitle] = useState(record?.title ?? "");
  const [provider, setProvider] = useState(record?.provider ?? "");
  const [date, setDate] = useState(toLocalDateValue(record?.date ?? new Date()));
  const [followUpDate, setFollowUpDate] = useState(record?.followUpDate ? toLocalDateValue(record.followUpDate) : "");
  const [notes, setNotes] = useState(record?.notes ?? "");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }
    const payload = {
      type,
      title: title.trim(),
      provider: provider.trim() || null,
      date,
      followUpDate: followUpDate || null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && record ? await updateMedicalRecordAction(record.id, payload) : await createMedicalRecordAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit record" : "Add medical record"}</DialogTitle>
        <DialogDescription>Appointments, prescriptions, tests, and more.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as MedicalRecordType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MEDICAL_RECORD_TYPE_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {meta.icon} {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="medical-title">Title</Label>
          <Input id="medical-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="medical-provider">Provider</Label>
          <Input id="medical-provider" value={provider} onChange={(e) => setProvider(e.target.value)} maxLength={120} placeholder="Doctor, clinic, pharmacy…" />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="medical-date">Date</Label>
            <Input id="medical-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="medical-followup">Follow-up date</Label>
            <Input id="medical-followup" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="medical-notes">Notes</Label>
          <Textarea id="medical-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add record"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function MedicalRecordFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  record?: MedicalRecordDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <MedicalRecordFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
