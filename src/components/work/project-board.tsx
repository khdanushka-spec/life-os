import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectCard } from "@/components/work/project-card";
import { PROJECT_STATUS_META } from "@/lib/work";
import type { ClientOption, ProjectWithStats } from "@/components/work/types";
import type { ProjectStatus } from "@/generated/prisma/client";

const GROUP_ORDER: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

export function ProjectBoard({ projects, clients }: { projects: ProjectWithStats[]; clients: ClientOption[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-base">Projects</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {projects.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No projects yet — create your first one to get started.
          </p>
        )}
        {GROUP_ORDER.map((status) => {
          const group = projects.filter((p) => p.status === status);
          if (group.length === 0) return null;
          return (
            <div key={status} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {PROJECT_STATUS_META[status].label} ({group.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.map((project) => (
                  <ProjectCard key={project.id} project={project} clients={clients} />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
