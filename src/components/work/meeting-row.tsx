"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleMeetingCompletedAction, deleteMeetingAction } from "@/server/actions/work";
import { formatMeetingTime } from "@/lib/work";
import { MeetingFormDialog, type MeetingDetail } from "@/components/work/meeting-form-dialog";
import type { ClientOption } from "@/components/work/types";
import { cn } from "@/lib/utils";

export function MeetingRow({
  meeting,
  completed,
  projectName,
  clientName,
  projects,
  clients,
}: {
  meeting: MeetingDetail;
  completed: boolean;
  projectName: string | null;
  clientName: string | null;
  projects: { id: string; name: string }[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <Checkbox
        checked={completed}
        className="mt-0.5"
        onCheckedChange={(checked) =>
          startTransition(async () => {
            await toggleMeetingCompletedAction(meeting.id, Boolean(checked));
            router.refresh();
          })
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn("text-sm font-medium", completed && "text-muted-foreground line-through")}>{meeting.title}</span>
        <span className="text-xs text-muted-foreground">{formatMeetingTime(meeting.startTime)}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {projectName && <Badge variant="secondary">{projectName}</Badge>}
          {clientName && <Badge variant="outline">{clientName}</Badge>}
          {meeting.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" /> {meeting.location}
            </span>
          )}
          {meeting.attendees.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users2 className="size-3" /> {meeting.attendees.join(", ")}
            </span>
          )}
        </div>
        {meeting.notes && <p className="text-xs text-muted-foreground">{meeting.notes}</p>}
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
            onClick={() => startTransition(async () => { await deleteMeetingAction(meeting.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MeetingFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" meeting={meeting} projects={projects} clients={clients} />
    </div>
  );
}
