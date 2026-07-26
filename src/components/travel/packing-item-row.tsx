"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { togglePackingItemAction, deletePackingItemAction } from "@/server/actions/travel";
import type { PackingItemDetail } from "@/components/travel/types";
import { cn } from "@/lib/utils";

export function PackingItemRow({ item }: { item: PackingItemDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", isPending && "opacity-60")}>
      <Checkbox
        checked={item.packed}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            await togglePackingItemAction(item.id, item.tripId, Boolean(checked));
            router.refresh();
          })
        }
      />
      <span className={cn("flex-1 text-sm", item.packed && "text-muted-foreground line-through")}>{item.name}</span>
      {item.category && <span className="text-xs text-muted-foreground">{item.category}</span>}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Remove item"
        onClick={() => startTransition(async () => { await deletePackingItemAction(item.id, item.tripId); router.refresh(); })}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
