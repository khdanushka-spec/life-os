"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTripAction } from "@/server/actions/travel";
import { TripFormDialog } from "@/components/travel/trip-form-dialog";
import type { TripDetail } from "@/components/travel/types";

export function TripHeroActions({ trip }: { trip: TripDetail }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More actions" />}>
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => startTransition(async () => { await deleteTripAction(trip.id); router.push("/travel"); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TripFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" trip={trip} />
    </>
  );
}
