"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateFormDialog } from "@/components/learning/certificate-form-dialog";

export function CertificatesHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">Credentials earned, and when they expire.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Add Certificate
      </Button>
      <CertificateFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
