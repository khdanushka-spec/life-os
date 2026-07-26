"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Building2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteMedicalRecordAction } from "@/server/actions/health";
import { MedicalRecordFormDialog } from "@/components/health/medical-record-form-dialog";
import { MEDICAL_RECORD_TYPE_META } from "@/lib/health";
import type { MedicalRecordDetail } from "@/components/health/types";
import { cn } from "@/lib/utils";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function MedicalRecordRow({ record }: { record: MedicalRecordDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const meta = MEDICAL_RECORD_TYPE_META[record.type];
  const followUpSoon = record.followUpDate && record.followUpDate >= new Date();

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            {meta.icon} {meta.label}
          </Badge>
          {followUpSoon && (
            <Badge variant="outline" className="gap-1">
              <CalendarClock className="size-3" /> Follow-up {formatDate(record.followUpDate!)}
            </Badge>
          )}
        </div>
        <span className="text-sm font-medium">{record.title}</span>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDate(record.date)}</span>
          {record.provider && (
            <span className="flex items-center gap-1">
              <Building2 className="size-3" /> {record.provider}
            </span>
          )}
        </div>
        {record.notes && <p className="text-xs text-muted-foreground">{record.notes}</p>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => startTransition(async () => { await deleteMedicalRecordAction(record.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MedicalRecordFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" record={record} />
    </div>
  );
}
