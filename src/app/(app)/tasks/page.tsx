import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { startOfWeek, startOfBrisbaneDay, brisbaneDateKey } from "@/lib/date";
import { computeFocusScore, estimateWorkloadMinutes, SMART_LISTS, type SmartListId } from "@/lib/tasks";
import { getOrGenerateDailyInsight } from "@/lib/ai/tasks";
import { TasksHero } from "@/components/tasks/tasks-hero";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { TaskToolbar } from "@/components/tasks/task-toolbar";
import { TaskCard, type TaskCardData } from "@/components/tasks/task-card";
import { TaskBoard } from "@/components/tasks/task-board";
import { RightSidebar } from "@/components/tasks/right-sidebar";
import type { Task, Priority } from "@/generated/prisma/client";

// Brisbane calendar-day equality, not the server's (UTC) - see
// lib/date.ts's brisbaneDateKey for why.
function isSameDay(a: Date, b: Date): boolean {
  return brisbaneDateKey(a) === brisbaneDateKey(b);
}

function matchesList(task: Task, list: SmartListId, now: Date): boolean {
  if (list === "archive") return task.archived;
  if (task.archived) return false;
  if (list === "pinned") return task.pinned;
  if (list === "completed") return task.status === "DONE";
  if (list === "waiting") return task.status === "WAITING";
  if (list === "someday") return task.status === "SOMEDAY";
  if (task.status === "DONE") return false;

  if (list === "inbox") return !task.projectId && !task.dueDate;
  if (list === "overdue") return !!task.dueDate && task.dueDate < startOfBrisbaneDay(now);
  if (list === "today") return !!task.dueDate && isSameDay(task.dueDate, now);
  if (list === "week") {
    if (!task.dueDate) return false;
    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return task.dueDate >= weekStart && task.dueDate < weekEnd;
  }
  if (list === "upcoming") return !!task.dueDate && task.dueDate >= startOfBrisbaneDay(now) && !isSameDay(task.dueDate, now);
  return false;
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  SOMEDAY_PRIORITY: 1,
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string; project?: string; q?: string; priority?: string; sort?: string; view?: string }>;
}) {
  const params = await searchParams;
  const dbUser = await requireDbUser();
  const now = new Date();

  const [allTasks, projects, dailyInsight] = await Promise.all([
    prisma.task.findMany({
      where: { userId: dbUser.id, parentId: null },
      include: { project: true, subtasks: { select: { status: true } }, _count: { select: { comments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId: dbUser.id, archived: false },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getOrGenerateDailyInsight(dbUser.id),
  ]);

  const activeList = (params.list as SmartListId) ?? "today";
  const counts = Object.fromEntries(
    SMART_LISTS.map((l) => [l.id, allTasks.filter((t) => matchesList(t, l.id, now)).length]),
  ) as Record<SmartListId, number>;

  let visible: TaskCardData[] = allTasks;
  if (params.project) {
    visible = visible.filter((t) => t.projectId === params.project && !t.archived);
  } else {
    visible = visible.filter((t) => matchesList(t, activeList, now));
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    visible = visible.filter(
      (t) => t.title.toLowerCase().includes(q) || t.descriptionText.toLowerCase().includes(q),
    );
  }
  if (params.priority) {
    visible = visible.filter((t) => t.priority === params.priority);
  }
  const sort = params.sort ?? "dueDate";
  visible = [...visible].sort((a, b) => {
    if (sort === "priority") return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (sort === "created") return b.createdAt.getTime() - a.createdAt.getTime();
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const dueToday = allTasks.filter((t) => matchesList(t, "today", now));
  const overdue = allTasks.filter((t) => matchesList(t, "overdue", now));
  const completedToday = allTasks.filter((t) => t.completedAt && isSameDay(t.completedAt, now));
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekTasks = allTasks.filter((t) => t.createdAt >= weekStart && t.createdAt < weekEnd);
  const weekCompleted = weekTasks.filter((t) => t.status === "DONE");
  const weeklyCompletionPercent = weekTasks.length ? Math.round((weekCompleted.length / weekTasks.length) * 100) : 0;

  const focusScore = computeFocusScore({
    dueTodayCount: dueToday.length,
    completedTodayCount: completedToday.length,
    overdueCount: overdue.length,
    estimatedMinutesToday: estimateWorkloadMinutes(dueToday),
  });

  const name = dbUser.username ?? dbUser.email?.split("@")[0] ?? "there";
  const view = params.view === "board" ? "board" : "list";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <TasksHero
        name={name}
        focusScore={focusScore}
        dueTodayCount={dueToday.length}
        overdueCount={overdue.length}
        completedTodayCount={completedToday.length}
        weeklyCompletionPercent={weeklyCompletionPercent}
      />

      <QuickCapture />

      <div className="flex flex-col gap-6 lg:flex-row">
        <TaskSidebar activeList={activeList} counts={counts} projects={projects} activeProjectId={params.project} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <TaskToolbar view={view} />
          {view === "board" ? (
            <TaskBoard tasks={visible} />
          ) : (
            <div className="flex flex-col gap-2">
              {visible.length === 0 && (
                <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nothing here.
                </p>
              )}
              {visible.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        <RightSidebar userId={dbUser.id} tasks={allTasks} dailyInsight={dailyInsight} />
      </div>
    </div>
  );
}
