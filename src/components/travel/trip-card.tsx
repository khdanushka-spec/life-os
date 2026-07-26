"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Pencil, Trash2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTripAction } from "@/server/actions/travel";
import { formatCurrency } from "@/lib/finance";
import { TRIP_STATUS_META, formatTripDateRange } from "@/lib/travel";
import { TripFormDialog } from "@/components/travel/trip-form-dialog";
import type { TripSummary } from "@/components/travel/types";
import { cn } from "@/lib/utils";

export function TripCard({ trip }: { trip: TripSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const dateRange = formatTripDateRange(trip.startDate, trip.endDate);
  const packingPercent = trip.packingCount > 0 ? Math.round((trip.packedCount / trip.packingCount) * 100) : null;

  return (
    <Card className={cn("border-none bg-card/60 backdrop-blur-xl transition-all hover:-translate-y-0.5", isPending && "opacity-60")}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/travel/${trip.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
            <MapPin className="size-3.5 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">
              {trip.destination}
              {trip.country && <span className="text-muted-foreground"> · {trip.country}</span>}
            </span>
          </Link>
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
                onClick={() => startTransition(async () => { await deleteTripAction(trip.id); router.refresh(); })}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {dateRange && <span className="text-xs text-muted-foreground">{dateRange}</span>}

        {packingPercent != null && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Packing {trip.packedCount}/{trip.packingCount}</span>
              <span>{packingPercent}%</span>
            </div>
            <Progress value={packingPercent} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={TRIP_STATUS_META[trip.status].color}>
            {TRIP_STATUS_META[trip.status].label}
          </Badge>
          {trip.bookingCount > 0 && <Badge variant="secondary">{trip.bookingCount} booking{trip.bookingCount === 1 ? "" : "s"}</Badge>}
          {trip.budget != null && <Badge variant="outline">{formatCurrency(trip.budget)}</Badge>}
        </div>
      </CardContent>

      <TripFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" trip={trip} />
    </Card>
  );
}
