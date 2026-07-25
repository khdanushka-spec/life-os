import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { TaskList } from "@/components/tasks/task-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

export default async function TasksPage() {
  const dbUser = await requireDbUser();
  const tasks = await prisma.task.findMany({
    where: { userId: dbUser.id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Everything on your plate, in one list.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <NewTaskForm />
          <TaskList tasks={tasks} />
        </CardContent>
      </Card>
    </div>
  );
}
