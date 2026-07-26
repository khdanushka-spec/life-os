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
import { createCertificateAction, updateCertificateAction } from "@/server/actions/learning";
import type { CertificateDetail } from "@/components/learning/types";

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function CertificateFormBody({
  onOpenChange,
  mode,
  certificate,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  certificate?: CertificateDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(certificate?.title ?? "");
  const [issuer, setIssuer] = useState(certificate?.issuer ?? "");
  const [issueDate, setIssueDate] = useState(toLocalDateValue(certificate?.issueDate ?? new Date()));
  const [expiryDate, setExpiryDate] = useState(certificate?.expiryDate ? toLocalDateValue(certificate.expiryDate) : "");
  const [credentialUrl, setCredentialUrl] = useState(certificate?.credentialUrl ?? "");
  const [notes, setNotes] = useState(certificate?.notes ?? "");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!issueDate) {
      setError("Issue date is required.");
      return;
    }
    const payload = {
      title: title.trim(),
      issuer: issuer.trim() || null,
      issueDate,
      expiryDate: expiryDate || null,
      credentialUrl: credentialUrl.trim() || null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result =
        mode === "edit" && certificate ? await updateCertificateAction(certificate.id, payload) : await createCertificateAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit certificate" : "Add certificate"}</DialogTitle>
        <DialogDescription>Credentials earned, and when they expire.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="certificate-title">Title</Label>
          <Input id="certificate-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="certificate-issuer">Issuer</Label>
          <Input id="certificate-issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} maxLength={120} placeholder="AWS, Google, university…" />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="certificate-issue-date">Issue date</Label>
            <Input id="certificate-issue-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="certificate-expiry-date">Expiry date</Label>
            <Input id="certificate-expiry-date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="certificate-url">Credential link</Label>
          <Input id="certificate-url" value={credentialUrl} onChange={(e) => setCredentialUrl(e.target.value)} maxLength={500} placeholder="https://…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="certificate-notes">Notes</Label>
          <Textarea id="certificate-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add certificate"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CertificateFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  certificate?: CertificateDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <CertificateFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
