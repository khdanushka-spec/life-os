"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Link2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteCertificateAction } from "@/server/actions/learning";
import { CertificateFormDialog } from "@/components/learning/certificate-form-dialog";
import type { CertificateDetail } from "@/components/learning/types";
import { cn } from "@/lib/utils";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function CertificateRow({ certificate }: { certificate: CertificateDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const expiringSoon = certificate.expiryDate && certificate.expiryDate >= new Date();

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {certificate.issuer && <Badge variant="secondary">{certificate.issuer}</Badge>}
          {expiringSoon && (
            <Badge variant="outline" className="gap-1">
              <CalendarClock className="size-3" /> Expires {formatDate(certificate.expiryDate!)}
            </Badge>
          )}
        </div>
        <span className="text-sm font-medium">{certificate.title}</span>
        <span className="text-xs text-muted-foreground">Issued {formatDate(certificate.issueDate)}</span>
        {certificate.credentialUrl && (
          <a
            href={certificate.credentialUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link2 className="size-3" /> {certificate.credentialUrl}
          </a>
        )}
        {certificate.notes && <p className="text-xs text-muted-foreground">{certificate.notes}</p>}
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
            onClick={() => startTransition(async () => { await deleteCertificateAction(certificate.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CertificateFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" certificate={certificate} />
    </div>
  );
}
