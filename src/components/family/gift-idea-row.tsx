"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteGiftIdeaAction } from "@/server/actions/family";
import { GiftIdeaFormDialog } from "@/components/family/gift-idea-form-dialog";
import { GIFT_IDEA_STATUS_META } from "@/lib/family";
import { formatCurrency } from "@/lib/finance";
import type { GiftIdeaDetail, MemberOption } from "@/components/family/types";
import { cn } from "@/lib/utils";

export function GiftIdeaRow({ giftIdea, memberName, members }: { giftIdea: GiftIdeaDetail; memberName: string; members: MemberOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const meta = GIFT_IDEA_STATUS_META[giftIdea.status];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            {meta.icon} {meta.label}
          </Badge>
          <Badge variant="outline">{memberName}</Badge>
          {giftIdea.occasion && <span className="text-xs text-muted-foreground">{giftIdea.occasion}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{giftIdea.title}</span>
          {giftIdea.price != null && <span className="text-xs text-muted-foreground">{formatCurrency(giftIdea.price)}</span>}
        </div>
        {giftIdea.url && (
          <a
            href={giftIdea.url}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link2 className="size-3" /> {giftIdea.url}
          </a>
        )}
        {giftIdea.notes && <p className="text-xs text-muted-foreground">{giftIdea.notes}</p>}
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
            onClick={() => startTransition(async () => { await deleteGiftIdeaAction(giftIdea.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <GiftIdeaFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" giftIdea={giftIdea} members={members} />
    </div>
  );
}
