"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Pencil, Archive, Trash2, Users2 } from "lucide-react";
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
import { archiveProjectAction, deleteProjectAction } from "@/server/actions/tasks";
import { formatCurrency } from "@/lib/finance";
import { formatDeadline, PROJECT_STATUS_META } from "@/lib/work";
import { ProjectFormDialog } from "@/components/work/project-form-dialog";
import type { ClientOption, ProjectWithStats } from "@/components/work/types";
import { cn } from "@/lib/utils";

export function ProjectCard({ project, clients }: { project: ProjectWithStats; clients: ClientOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const deadline = formatDeadline(project.deadline);

  return (
    <Card className={cn("border-none bg-card/60 backdrop-blur-xl transition-all hover:-translate-y-0.5", isPending && "opacity-60")}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/work/${project.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
            <span className="truncate text-sm font-medium">{project.name}</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => startTransition(async () => { await archiveProjectAction(project.id); router.refresh(); })}
              >
                <Archive /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => startTransition(async () => { await deleteProjectAction(project.id); router.refresh(); })}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {project.client && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users2 className="size-3" /> {project.client.name}
          </span>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{project.doneTaskCount}/{project.taskCount} tasks</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={PROJECT_STATUS_META[project.status].color}>
            {PROJECT_STATUS_META[project.status].label}
          </Badge>
          {deadline && (
            <Badge variant={deadline.overdue ? "destructive" : deadline.urgent ? "secondary" : "outline"}>
              {deadline.label}
            </Badge>
          )}
          {project.budget != null && <Badge variant="outline">{formatCurrency(project.budget)}</Badge>}
        </div>
      </CardContent>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" project={project} clients={clients} />
    </Card>
  );
}
