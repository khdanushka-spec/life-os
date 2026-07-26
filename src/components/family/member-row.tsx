"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cake, MoreVertical, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setMemberArchivedAction, deleteMemberAction } from "@/server/actions/family";
import { MemberFormDialog } from "@/components/family/member-form-dialog";
import type { MemberDetail } from "@/components/family/types";
import { cn } from "@/lib/utils";

export function MemberRow({ member }: { member: MemberDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{member.name}</span>
          {member.relationship && <Badge variant="secondary">{member.relationship}</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {member.birthday && (
            <span className="flex items-center gap-1">
              <Cake className="size-3" />
              {member.birthday.toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "long" })}
            </span>
          )}
        </div>
        {member.notes && <p className="text-xs text-muted-foreground">{member.notes}</p>}
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
                await setMemberArchivedAction(member.id, !member.archived);
                router.refresh();
              })
            }
          >
            {member.archived ? <ArchiveRestore /> : <Archive />}
            {member.archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                await deleteMemberAction(member.id);
                router.refresh();
              })
            }
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MemberFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" member={member} />
    </div>
  );
}
