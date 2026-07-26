"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteBookingAction } from "@/server/actions/travel";
import { BookingFormDialog } from "@/components/travel/booking-form-dialog";
import { BOOKING_TYPE_META } from "@/lib/travel";
import { formatCurrency } from "@/lib/finance";
import type { BookingDetail } from "@/components/travel/types";
import { cn } from "@/lib/utils";

function formatBookingTime(date: Date): string {
  return date.toLocaleString("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BookingRow({ booking }: { booking: BookingDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const meta = BOOKING_TYPE_META[booking.type];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            {meta.icon} {meta.label}
          </Badge>
          {booking.provider && <Badge variant="outline">{booking.provider}</Badge>}
          {booking.cost != null && <span className="text-xs text-muted-foreground">{formatCurrency(booking.cost)}</span>}
        </div>
        <span className="text-sm font-medium">{booking.title}</span>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {booking.startAt && <span>{formatBookingTime(booking.startAt)}</span>}
          {booking.confirmationNumber && (
            <span className="flex items-center gap-1">
              <Hash className="size-3" /> {booking.confirmationNumber}
            </span>
          )}
        </div>
        {booking.notes && <p className="text-xs text-muted-foreground">{booking.notes}</p>}
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
            onClick={() => startTransition(async () => { await deleteBookingAction(booking.id, booking.tripId); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BookingFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" tripId={booking.tripId} booking={booking} />
    </div>
  );
}
