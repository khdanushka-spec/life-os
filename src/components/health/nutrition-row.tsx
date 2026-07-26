"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteNutritionEntryAction } from "@/server/actions/health";
import { NutritionFormDialog } from "@/components/health/nutrition-form-dialog";
import { MEAL_TYPE_META } from "@/lib/health";
import type { NutritionDetail } from "@/components/health/types";
import { cn } from "@/lib/utils";

export function NutritionRow({ entry }: { entry: NutritionDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const meta = MEAL_TYPE_META[entry.mealType];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            {meta.icon} {meta.label}
          </Badge>
          {entry.calories != null && <span className="text-xs text-muted-foreground">{entry.calories} cal</span>}
        </div>
        <span className="text-sm font-medium">{entry.description}</span>
        <span className="text-xs text-muted-foreground">
          {entry.loggedAt.toLocaleString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        </span>
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
            onClick={() => startTransition(async () => { await deleteNutritionEntryAction(entry.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NutritionFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" entry={entry} />
    </div>
  );
}
