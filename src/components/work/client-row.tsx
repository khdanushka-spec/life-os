"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, MoreVertical, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setClientArchivedAction, deleteClientAction } from "@/server/actions/work";
import { ClientFormDialog, type ClientDetail } from "@/components/work/client-form-dialog";
import { cn } from "@/lib/utils";

export function ClientRow({ client, projectCount }: { client: ClientDetail & { archived: boolean }; projectCount: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{client.name}</span>
          {client.company && <span className="text-xs text-muted-foreground">· {client.company}</span>}
          {projectCount > 0 && <Badge variant="secondary">{projectCount} project{projectCount === 1 ? "" : "s"}</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {client.email && (
            <span className="flex items-center gap-1">
              <Mail className="size-3" /> {client.email}
            </span>
          )}
          {client.phone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3" /> {client.phone}
            </span>
          )}
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
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                await setClientArchivedAction(client.id, !client.archived);
                router.refresh();
              })
            }
          >
            {client.archived ? <ArchiveRestore /> : <Archive />}
            {client.archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                await deleteClientAction(client.id);
                router.refresh();
              })
            }
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" client={client} />
    </div>
  );
}
