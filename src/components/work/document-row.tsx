"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteDocumentAction } from "@/server/actions/work";
import { DocumentFormDialog, type DocumentDetail } from "@/components/work/document-form-dialog";
import type { ClientOption } from "@/components/work/types";
import { cn } from "@/lib/utils";

export function DocumentRow({
  document: doc,
  projectName,
  clientName,
  projects,
  clients,
}: {
  document: DocumentDetail;
  projectName: string | null;
  clientName: string | null;
  projects: { id: string; name: string }[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {doc.url ? (
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-medium hover:underline">
              {doc.title} <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="text-sm font-medium">{doc.title}</span>
          )}
        </div>
        {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          {projectName && <Badge variant="secondary">{projectName}</Badge>}
          {clientName && <Badge variant="outline">{clientName}</Badge>}
          {doc.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
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
            onClick={() => startTransition(async () => { await deleteDocumentAction(doc.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DocumentFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" document={doc} projects={projects} clients={clients} />
    </div>
  );
}
