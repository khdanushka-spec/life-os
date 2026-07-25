"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { Priority, EnergyLevel, TaskStatus, RecurringInterval, type ReportPeriod } from "@/generated/prisma/client";
import {
  parseQuickCapture,
  suggestSubtasks,
  suggestPriority,
  suggestEstimate,
  explainBlockers,
  draftMessage,
  getOrGenerateDailyInsight,
  generateTaskReport,
} from "@/lib/ai/tasks";
import type { QuickCaptureDraft } from "@/lib/ai/tasks";

function revalidateTasks(subpath?: string) {
  revalidatePath("/tasks");
  revalidatePath("/home");
  if (subpath) revalidatePath(subpath);
}

// ---------- Tasks ----------

const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(280),
  descriptionJson: z.unknown().nullable().optional(),
  descriptionText: z.string().max(20000).optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  energy: z.nativeEnum(EnergyLevel).nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  repeatInterval: z.nativeEnum(RecurringInterval).nullable().optional(),
});
export type TaskInput = z.infer<typeof taskInputSchema>;

export async function createTaskAction(input: TaskInput): Promise<{ id: string } | null> {
  const dbUser = await requireDbUser();
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return null;
  const { dueDate, descriptionJson, ...rest } = parsed.data;

  const task = await prisma.task.create({
    data: {
      userId: dbUser.id,
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
      descriptionJson: (descriptionJson as object) ?? undefined,
    },
    select: { id: true },
  });

  revalidateTasks();
  return task;
}

const taskUpdateSchema = taskInputSchema.partial().extend({
  progressPercent: z.number().int().min(0).max(100).nullable().optional(),
});

export async function updateTaskAction(taskId: string, input: Partial<TaskInput> & { progressPercent?: number | null }) {
  const dbUser = await requireDbUser();
  const parsed = taskUpdateSchema.safeParse(input);
  if (!parsed.success) return;
  const { dueDate, descriptionJson, ...rest } = parsed.data;

  await prisma.task.updateMany({
    where: { id: taskId, userId: dbUser.id },
    data: {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(descriptionJson !== undefined ? { descriptionJson: descriptionJson as object } : {}),
    },
  });

  revalidateTasks(`/tasks/${taskId}`);
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus) {
  const dbUser = await requireDbUser();
  await prisma.task.updateMany({
    where: { id: taskId, userId: dbUser.id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });
  revalidateTasks();
}

export async function togglePinnedAction(taskId: string, pinned: boolean) {
  const dbUser = await requireDbUser();
  await prisma.task.updateMany({ where: { id: taskId, userId: dbUser.id }, data: { pinned } });
  revalidateTasks();
}

export async function archiveTaskAction(taskId: string, archived: boolean) {
  const dbUser = await requireDbUser();
  await prisma.task.updateMany({ where: { id: taskId, userId: dbUser.id }, data: { archived } });
  revalidateTasks();
}

export async function deleteTaskAction(taskId: string) {
  const dbUser = await requireDbUser();
  await prisma.task.deleteMany({ where: { id: taskId, userId: dbUser.id } });
  revalidateTasks();
}

// ---------- Projects ----------

const projectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().trim().min(1).max(20),
});

export async function createProjectAction(input: z.infer<typeof projectSchema>) {
  const dbUser = await requireDbUser();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return null;
  const project = await prisma.project.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateTasks();
  return project;
}

export async function archiveProjectAction(projectId: string) {
  const dbUser = await requireDbUser();
  await prisma.project.updateMany({ where: { id: projectId, userId: dbUser.id }, data: { archived: true } });
  revalidateTasks();
}

export async function deleteProjectAction(projectId: string) {
  const dbUser = await requireDbUser();
  // Tasks keep existing (Task.projectId -> SetNull) - deleting a project
  // only unlinks it, never deletes the tasks in it.
  await prisma.project.deleteMany({ where: { id: projectId, userId: dbUser.id } });
  revalidateTasks();
}

// ---------- Comments ----------

const commentSchema = z.object({
  taskId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export async function addCommentAction(input: z.infer<typeof commentSchema>) {
  const dbUser = await requireDbUser();
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return null;

  const task = await prisma.task.findFirst({ where: { id: parsed.data.taskId, userId: dbUser.id } });
  if (!task) return null;

  const comment = await prisma.comment.create({
    data: { taskId: parsed.data.taskId, userId: dbUser.id, body: parsed.data.body },
  });
  revalidateTasks(`/tasks/${parsed.data.taskId}`);
  return comment;
}

export async function deleteCommentAction(commentId: string) {
  const dbUser = await requireDbUser();
  await prisma.comment.deleteMany({ where: { id: commentId, userId: dbUser.id } });
  revalidateTasks();
}

// ---------- Quick note ----------

export async function saveQuickNoteAction(content: string) {
  const dbUser = await requireDbUser();
  const trimmed = content.slice(0, 5000);
  await prisma.quickNote.upsert({
    where: { userId: dbUser.id },
    update: { content: trimmed },
    create: { userId: dbUser.id, content: trimmed },
  });
  revalidateTasks();
}

// ---------- AI ----------

export async function parseQuickCaptureAction(text: string): Promise<QuickCaptureDraft> {
  await requireDbUser();
  return parseQuickCapture(text, new Date());
}

export async function suggestSubtasksAction(taskId: string): Promise<string[] | null> {
  const dbUser = await requireDbUser();
  const task = await prisma.task.findFirst({ where: { id: taskId, userId: dbUser.id } });
  if (!task) return null;
  return suggestSubtasks(task);
}

export async function applySuggestedSubtasksAction(parentId: string, titles: string[]) {
  const dbUser = await requireDbUser();
  const parent = await prisma.task.findFirst({ where: { id: parentId, userId: dbUser.id } });
  if (!parent) return;

  await prisma.task.createMany({
    data: titles
      .filter((t) => t.trim().length > 0)
      .map((title) => ({ userId: dbUser.id, parentId, title: title.trim() })),
  });
  revalidateTasks(`/tasks/${parentId}`);
}

export async function suggestPriorityAction(taskId: string) {
  const dbUser = await requireDbUser();
  const task = await prisma.task.findFirst({ where: { id: taskId, userId: dbUser.id } });
  if (!task) return null;
  const result = await suggestPriority(task);
  if (result) {
    await prisma.task.update({ where: { id: taskId }, data: { aiSuggestedPriority: result.priority } });
    revalidateTasks(`/tasks/${taskId}`);
  }
  return result;
}

export async function suggestEstimateAction(taskId: string) {
  const dbUser = await requireDbUser();
  const task = await prisma.task.findFirst({ where: { id: taskId, userId: dbUser.id } });
  if (!task) return null;
  return suggestEstimate(task);
}

export async function explainBlockersAction(taskId: string): Promise<string | null> {
  const dbUser = await requireDbUser();
  const task = await prisma.task.findFirst({ where: { id: taskId, userId: dbUser.id } });
  if (!task) return null;
  return explainBlockers(task);
}

export async function draftMessageAction(taskId: string): Promise<string | null> {
  const dbUser = await requireDbUser();
  const task = await prisma.task.findFirst({ where: { id: taskId, userId: dbUser.id } });
  if (!task) return null;
  return draftMessage(task);
}

export async function regenerateDailyInsightAction(): Promise<string | null> {
  const dbUser = await requireDbUser();
  const today = new Date(new Date().toISOString().slice(0, 10));
  await prisma.taskAiCache
    .delete({ where: { userId_date_kind: { userId: dbUser.id, date: today, kind: "insight" } } })
    .catch(() => {});
  const insight = await getOrGenerateDailyInsight(dbUser.id);
  revalidateTasks();
  return insight;
}

export async function generateTaskReportAction(period: ReportPeriod, periodStart: string) {
  const dbUser = await requireDbUser();
  const summary = await generateTaskReport(dbUser.id, period, new Date(periodStart));
  revalidateTasks("/tasks/analytics");
  return summary;
}
