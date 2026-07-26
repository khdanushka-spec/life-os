"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleFavoriteAction, deleteVaultItemAction } from "@/server/actions/vault";
import { LinkFormDialog } from "@/components/vault/link-form-dialog";
import { VAULT_ITEM_TYPE_META } from "@/lib/vault";
import type { VaultItemSummary } from "@/components/vault/types";
import { cn } from "@/lib/utils";

export function VaultItemRow({ item }: { item: VaultItemSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const meta = VAULT_ITEM_TYPE_META[item.type];
  const preview = item.contentText.length > 180 ? `${item.contentText.slice(0, 180)}...` : item.contentText;

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <button
        type="button"
        aria-label={item.favorited ? "Unfavorite" : "Favorite"}
        onClick={() =>
          startTransition(async () => {
            await toggleFavoriteAction(item.id, !item.favorited);
            router.refresh();
          })
        }
        className="mt-0.5"
      >
        <Star className={cn("size-4", item.favorited ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            {meta.icon} {meta.label}
          </Badge>
          {item.category && <Badge variant="outline">{item.category}</Badge>}
        </div>
        {item.type === "NOTE" ? (
          <Link href={`/vault/${item.id}`} className="text-sm font-medium hover:underline">
            {item.title}
          </Link>
        ) : (
          <a
            href={item.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {item.title} <ExternalLink className="size-3" />
          </a>
        )}
        {preview && <p className="text-xs text-muted-foreground">{preview}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          {item.tags.map((tag) => (
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
          {item.type === "LINK" ? (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => router.push(`/vault/${item.id}`)}>
              <Pencil /> Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => startTransition(async () => { await deleteVaultItemAction(item.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {item.type === "LINK" && (
        <LinkFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          link={{ id: item.id, title: item.title, url: item.url ?? "", contentText: item.contentText, category: item.category, tags: item.tags }}
        />
      )}
    </div>
  );
}
