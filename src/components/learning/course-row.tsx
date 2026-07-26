"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import { deleteCourseAction } from "@/server/actions/learning";
import { CourseFormDialog } from "@/components/learning/course-form-dialog";
import { COURSE_STATUS_META } from "@/lib/learning";
import type { CourseDetail } from "@/components/learning/types";
import { cn } from "@/lib/utils";

export function CourseRow({ course }: { course: CourseDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const meta = COURSE_STATUS_META[course.status];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            {meta.icon} {meta.label}
          </Badge>
          {course.provider && <Badge variant="outline">{course.provider}</Badge>}
        </div>
        <span className="text-sm font-medium">{course.title}</span>
        <div className="flex items-center gap-2">
          <Progress value={course.progressPercent} className="flex-1" />
          <span className="text-xs tabular-nums text-muted-foreground">{course.progressPercent}%</span>
        </div>
        {course.url && (
          <a
            href={course.url}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link2 className="size-3" /> {course.url}
          </a>
        )}
        {course.notes && <p className="text-xs text-muted-foreground">{course.notes}</p>}
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
            onClick={() => startTransition(async () => { await deleteCourseAction(course.id); router.refresh(); })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CourseFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" course={course} />
    </div>
  );
}
