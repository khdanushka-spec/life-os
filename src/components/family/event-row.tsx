"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteEventAction } from "@/server/actions/family";
import { EventFormDialog } from "@/components/family/event-form-dialog";
import { FAMILY_EVENT_TYPE_META } from "@/lib/family";
import type { EventDetail, MemberOption } from "@/components/family/types";
import { cn } from "@/lib/utils";

function formatEventTime(date: Date): string {
  return date.toLocaleString("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EventRow({ event, memberName, members }: { event: EventDetail; memberName: string | null; members: MemberOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const meta = FAMILY_EVENT_TYPE_META[event.type];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            {meta.icon} {meta.label}
          </Badge>
          {memberName && <Badge variant="outline">{memberName}</Badge>}
        </div>
        <span className="text-sm font-medium">{event.title}</span>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{formatEventTime(event.date)}</span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {event.location}
            </span>
          )}
        </div>
        {event.notes && <p className="text-xs text-muted-foreground">{event.notes}</p>}
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
            onClick={() => startTransition(async () => { await deleteEventAction(event.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EventFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" event={event} members={members} />
    </div>
  );
}
