"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedicalRecordFormDialog } from "@/components/health/medical-record-form-dialog";

export function MedicalHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Medical Records</h1>
        <p className="text-sm text-muted-foreground">Appointments, prescriptions, tests, and follow-ups.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Add Record
      </Button>
      <MedicalRecordFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
