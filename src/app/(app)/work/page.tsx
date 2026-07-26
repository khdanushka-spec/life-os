import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { computeProjectProgress, isWithinNextDays } from "@/lib/work";
import { WorkHeader } from "@/components/work/work-header";
import { WorkStatsRow } from "@/components/work/work-stats-row";
import { ProjectBoard } from "@/components/work/project-board";
import { UpcomingMeetings } from "@/components/work/upcoming-meetings";
import { ClientsQuickList } from "@/components/work/clients-quick-list";
import { RecentDocuments } from "@/components/work/recent-documents";
import type { ProjectWithStats } from "@/components/work/types";

export default async function WorkPage() {
  const dbUser = await requireDbUser();

  const [projects, clients, meetings, documents] = await Promise.all([
    prisma.project.findMany({
      where: { userId: dbUser.id, kind: "WORK", archived: false },
      orderBy: { createdAt: "desc" },
      include: { tasks: true, client: true },
    }),
    prisma.client.findMany({
      where: { userId: dbUser.id, archived: false },
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: true } } },
    }),
    prisma.meeting.findMany({
      where: { userId: dbUser.id, startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 5,
      include: { project: true, client: true },
    }),
    prisma.workDocument.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const projectsWithStats: ProjectWithStats[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    description: p.description,
    status: p.status,
    deadline: p.deadline,
    budget: p.budget ? Number(p.budget) : null,
    client: p.client ? { id: p.client.id, name: p.client.name, company: p.client.company } : null,
    taskCount: p.tasks.length,
    doneTaskCount: p.tasks.filter((t) => t.status === "DONE").length,
    progress: computeProjectProgress(p.tasks),
  }));

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000);

  const activeProjects = projectsWithStats.filter((p) => p.status === "ACTIVE").length;
  const upcomingDeadlines = projectsWithStats.filter((p) => p.deadline && isWithinNextDays(p.deadline, 7)).length;
  const meetingsThisWeekCount = await prisma.meeting.count({
    where: { userId: dbUser.id, startTime: { gte: now, lt: weekEnd } },
  });
  const openTasks = projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.status !== "DONE").length, 0);

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name, company: c.company }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <WorkHeader clients={clientOptions} />

      <WorkStatsRow
        activeProjects={activeProjects}
        upcomingDeadlines={upcomingDeadlines}
        meetingsThisWeek={meetingsThisWeekCount}
        openTasks={openTasks}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ProjectBoard projects={projectsWithStats} clients={clientOptions} />
        <div className="flex flex-col gap-6">
          <UpcomingMeetings
            meetings={meetings.map((m) => ({
              id: m.id,
              title: m.title,
              startTime: m.startTime,
              projectName: m.project?.name ?? null,
              clientName: m.client?.name ?? null,
            }))}
          />
          <ClientsQuickList
            clients={clients.map((c) => ({ id: c.id, name: c.name, company: c.company, projectCount: c._count.projects }))}
          />
          <RecentDocuments documents={documents.map((d) => ({ id: d.id, title: d.title, url: d.url }))} />
        </div>
      </div>
    </div>
  );
}
