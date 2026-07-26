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
import { createClientAction, updateClientAction } from "@/server/actions/work";

export type ClientDetail = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

function ClientFormBody({ onOpenChange, mode, client }: { onOpenChange: (open: boolean) => void; mode: "create" | "edit"; client?: ClientDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(client?.name ?? "");
  const [company, setCompany] = useState(client?.company ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const payload = {
      name: name.trim(),
      company: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && client ? await updateClientAction(client.id, payload) : await createClientAction(payload);
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
        <DialogTitle>{mode === "edit" ? "Edit client" : "New client"}</DialogTitle>
        <DialogDescription>Who you&apos;re working with.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-name">Name</Label>
          <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-company">Company</Label>
          <Input id="client-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="client-email">Email</Label>
            <Input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="client-phone">Phone</Label>
            <Input id="client-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-notes">Notes</Label>
          <Textarea id="client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add client"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ClientFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  client?: ClientDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <ClientFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
