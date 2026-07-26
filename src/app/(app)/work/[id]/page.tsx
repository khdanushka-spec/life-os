import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { computeProjectProgress, formatDeadline, formatMeetingTime, PROJECT_STATUS_META } from "@/lib/work";
import { formatCurrency } from "@/lib/finance";
import { TaskCard } from "@/components/tasks/task-card";
import { AddProjectTaskForm } from "@/components/work/add-project-task-form";
import { ProjectHeroActions } from "@/components/work/project-hero-actions";
import type { ProjectWithStats } from "@/components/work/types";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbUser = await requireDbUser();

  const project = await prisma.project.findFirst({
    where: { id, userId: dbUser.id },
    include: {
      client: true,
      tasks: {
        where: { parentId: null },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: { project: true, subtasks: { select: { status: true } }, _count: { select: { comments: true } } },
      },
      meetings: { orderBy: { startTime: "desc" }, take: 10, include: { client: true } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) notFound();

  const [clients] = await Promise.all([
    prisma.client.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { name: "asc" } }),
  ]);

  const progress = computeProjectProgress(project.tasks);
  const deadline = formatDeadline(project.deadline);
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name, company: c.company }));

  const projectWithStats: ProjectWithStats = {
    id: project.id,
    name: project.name,
    color: project.color,
    description: project.description,
    status: project.status,
    deadline: project.deadline,
    budget: project.budget ? Number(project.budget) : null,
    client: project.client ? { id: project.client.id, name: project.client.name, company: project.client.company } : null,
    taskCount: project.tasks.length,
    doneTaskCount: project.tasks.filter((t) => t.status === "DONE").length,
    progress,
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6">
      <Link href="/work" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Work
      </Link>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-2 size-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
              <div className="flex flex-col gap-1">
                <CardTitle className="text-2xl">{project.name}</CardTitle>
                {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="outline" className={PROJECT_STATUS_META[project.status].color}>
                    {PROJECT_STATUS_META[project.status].label}
                  </Badge>
                  {project.client && <Badge variant="secondary">{project.client.name}</Badge>}
                  {deadline && (
                    <Badge variant={deadline.overdue ? "destructive" : deadline.urgent ? "secondary" : "outline"}>
                      {deadline.label}
                    </Badge>
                  )}
                  {project.budget != null && <Badge variant="outline">{formatCurrency(Number(project.budget))}</Badge>}
                </div>
              </div>
            </div>
            <ProjectHeroActions project={projectWithStats} clients={clientOptions} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {projectWithStats.doneTaskCount}/{projectWithStats.taskCount} tasks complete
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <AddProjectTaskForm projectId={project.id} />
          {project.tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
          {project.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">Meetings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {project.meetings.length === 0 && <p className="text-sm text-muted-foreground">No meetings logged.</p>}
            {project.meetings.map((m) => (
              <div key={m.id} className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium">{m.title}</span>
                <span className="text-xs text-muted-foreground">{formatMeetingTime(m.startTime)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {project.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
            {project.documents.map((d) => (
              <a
                key={d.id}
                href={d.url ?? undefined}
                target={d.url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="text-sm hover:underline"
              >
                {d.title}
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
