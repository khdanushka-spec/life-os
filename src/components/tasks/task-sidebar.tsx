import Link from "next/link";
import { Layers } from "lucide-react";
import { SMART_LISTS, type SmartListId } from "@/lib/tasks";
import { ProjectForm } from "@/components/tasks/project-form";
import type { Project } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

export function TaskSidebar({
  activeList,
  counts,
  projects,
  activeProjectId,
}: {
  activeList: SmartListId;
  counts: Record<SmartListId, number>;
  projects: (Project & { _count: { tasks: number } })[];
  activeProjectId?: string;
}) {
  return (
    <nav className="flex w-full flex-col gap-4 lg:w-56 lg:shrink-0">
      <div className="flex flex-col gap-0.5">
        {SMART_LISTS.map((list) => {
          const Icon = list.icon;
          const active = activeList === list.id && !activeProjectId;
          return (
            <Link
              key={list.id}
              href={`/tasks?list=${list.id}`}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                active && "bg-primary/10 text-primary",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                {list.label}
              </span>
              {counts[list.id] > 0 && (
                <span className="text-xs text-muted-foreground">{counts[list.id]}</span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between px-2.5 py-1">
          <p className="text-xs font-medium text-muted-foreground">Projects</p>
          <ProjectForm />
        </div>
        {projects.length > 0 &&
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/tasks?project=${project.id}`}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                activeProjectId === project.id && "bg-primary/10 text-primary",
              )}
            >
              <span className="flex items-center gap-2">
                <Layers className="size-4" style={{ color: project.color }} />
                {project.name}
              </span>
              {project._count.tasks > 0 && (
                <span className="text-xs text-muted-foreground">{project._count.tasks}</span>
              )}
            </Link>
          ))}
      </div>
    </nav>
  );
}
