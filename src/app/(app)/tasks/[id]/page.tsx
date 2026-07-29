import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCompleteCheckbox } from "@/components/tasks/task-complete-checkbox";
import { TaskTitle } from "@/components/tasks/task-title";
import { TaskDescriptionEditor } from "@/components/tasks/task-description-editor-lazy";
import { TaskSubtasks } from "@/components/tasks/task-subtasks";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskDetailFields } from "@/components/tasks/task-detail-fields";
import { TaskAiPanel } from "@/components/tasks/task-ai-panel";
import { TaskRelated } from "@/components/tasks/task-related";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbUser = await requireDbUser();

  const [task, projects] = await Promise.all([
    prisma.task.findFirst({
      where: { id, userId: dbUser.id },
      include: { subtasks: { orderBy: { createdAt: "asc" } }, comments: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.project.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { createdAt: "asc" } }),
  ]);

  if (!task) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
      <Link href="/tasks" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Tasks
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex items-start gap-3">
                <TaskCompleteCheckbox taskId={task.id} status={task.status} />
                <TaskTitle taskId={task.id} initialTitle={task.title} />
              </div>
              <TaskDescriptionEditor taskId={task.id} initialJson={task.descriptionJson} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Subtasks</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskSubtasks parentId={task.id} subtasks={task.subtasks} />
            </CardContent>
          </Card>

          <TaskAiPanel taskId={task.id} />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskComments taskId={task.id} comments={task.comments} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskDetailFields task={task} projects={projects} />
            </CardContent>
          </Card>
          <TaskRelated userId={dbUser.id} dueDate={task.dueDate} />
        </div>
      </div>
    </div>
  );
}
