"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, MoreVertical, Pencil, Plane, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateWishlistDestinationAction, deleteWishlistDestinationAction, convertWishlistToTripAction } from "@/server/actions/travel";
import { WishlistFormDialog } from "@/components/travel/wishlist-form-dialog";
import type { WishlistDetail } from "@/components/travel/types";
import { cn } from "@/lib/utils";

export function WishlistRow({ destination }: { destination: WishlistDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <button
        type="button"
        aria-label={destination.starred ? "Unstar" : "Star"}
        onClick={() =>
          startTransition(async () => {
            await updateWishlistDestinationAction(destination.id, { starred: !destination.starred });
            router.refresh();
          })
        }
        className="mt-0.5"
      >
        <Star className={cn("size-4", destination.starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">
          {destination.destination}
          {destination.country && <span className="text-muted-foreground"> · {destination.country}</span>}
        </span>
        {destination.notes && <p className="text-xs text-muted-foreground">{destination.notes}</p>}
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
                const result = await convertWishlistToTripAction(destination.id);
                if (result.trip) router.push(`/travel/${result.trip.id}`);
                else router.refresh();
              })
            }
          >
            <Plane /> Convert to trip
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => startTransition(async () => { await deleteWishlistDestinationAction(destination.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <WishlistFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" destination={destination} />
    </div>
  );
}
