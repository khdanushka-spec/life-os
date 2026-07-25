import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { resolveAiModel } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { taskReportNarrativeSchema, type TaskReportSummary } from "@/lib/tasks";
import type { Task, ReportPeriod, Priority } from "@/generated/prisma/client";

const SYSTEM =
  "You are the task-planning voice inside AURA OS - direct, concise, practical. " +
  "You only ever see the user's real task data below. Never invent a task, a date, " +
  "or a fact that isn't explicitly given to you.";

function todayDate(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

async function readCache(userId: string, kind: string): Promise<unknown | null> {
  const cached = await prisma.taskAiCache.findUnique({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
  });
  return cached?.content ?? null;
}

async function writeCache(userId: string, kind: string, content: unknown) {
  await prisma.taskAiCache.upsert({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
    update: { content: content as object },
    create: { userId, date: todayDate(), kind, content: content as object },
  });
}

const quickCaptureSchema = z.object({
  title: z.string(),
  dueDate: z.string().nullable().describe("ISO date YYYY-MM-DD, or null if no date was mentioned"),
  dueTime: z.string().nullable().describe("24h HH:MM, or null if no time was mentioned"),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "SOMEDAY_PRIORITY"]).nullable(),
  tags: z.array(z.string()).max(5),
  estimatedMinutes: z.number().int().positive().nullable(),
});
export type QuickCaptureDraft = z.infer<typeof quickCaptureSchema>;

// Falls back to a plain task (the raw text as title, nothing else
// extracted) when no AI provider is configured - same graceful
// degradation as every other AI feature in this app. The caller always
// shows the result as editable chips before saving, so a bad parse is
// cheap to fix, never silently wrong.
export async function parseQuickCapture(text: string, now: Date): Promise<QuickCaptureDraft> {
  const fallback: QuickCaptureDraft = {
    title: text.trim(),
    dueDate: null,
    dueTime: null,
    priority: null,
    tags: [],
    estimatedMinutes: null,
  };

  const resolved = await resolveAiModel();
  if (!resolved) return fallback;

  try {
    const { output } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Today is ${now.toDateString()}. Parse this task capture into structured fields: "${text}"\n\nExtract a clean title (with the date/time/priority phrases removed), and any due date, due time, priority, tags (like #project or context words), and estimated duration that were actually stated or clearly implied. Leave a field null/empty if it wasn't mentioned - never guess.`,
      output: Output.object({ schema: quickCaptureSchema }),
    });
    return quickCaptureSchema.parse(output);
  } catch {
    return fallback;
  }
}

function taskLine(t: Task): string {
  const bits = [
    `"${t.title}"`,
    `status: ${t.status}`,
    `priority: ${t.priority}`,
    t.dueDate ? `due ${t.dueDate.toDateString()}` : "no due date",
    t.energy ? `energy: ${t.energy}` : null,
    t.estimatedMinutes ? `est. ${t.estimatedMinutes} min` : null,
    t.tags.length ? `tags: ${t.tags.join(", ")}` : null,
  ].filter(Boolean);
  return `- ${bits.join(", ")}${t.descriptionText ? `\n  notes: ${t.descriptionText.slice(0, 300)}` : ""}`;
}

export async function suggestSubtasks(task: Task): Promise<string[] | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;
  const { text } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Break this task into 3-6 concrete subtasks:\n${taskLine(task)}\n\nOne short subtask title per line, no numbering, no quotes.`,
  });
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);
  return lines.length ? lines : null;
}

export async function suggestPriority(
  task: Task,
): Promise<{ priority: Priority; reason: string } | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;
  const schema = z.object({
    priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "SOMEDAY_PRIORITY"]),
    reason: z.string(),
  });
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Given this task:\n${taskLine(task)}\n\nSuggest a priority level and a one-sentence reason, based only on what's stated above (due date urgency, stated importance) - don't assume context you don't have.`,
    output: Output.object({ schema }),
  });
  return schema.parse(output);
}

export async function suggestEstimate(
  task: Task,
): Promise<{ estimatedMinutes: number; reason: string } | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;
  const schema = z.object({ estimatedMinutes: z.number().int().positive(), reason: z.string() });
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Given this task:\n${taskLine(task)}\n\nEstimate how many minutes it would realistically take, and a one-sentence reason.`,
    output: Output.object({ schema }),
  });
  return schema.parse(output);
}

export async function explainBlockers(task: Task): Promise<string | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;
  const { text } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Given this task:\n${taskLine(task)}\n\nIn 1-2 sentences, note anything that might be blocking or slowing this down, based only on the data above (e.g. no due date set, vague title, overdue with no notes). If nothing stands out, say so plainly - don't invent a blocker.`,
  });
  return text;
}

export async function draftMessage(task: Task): Promise<string | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;
  const { text } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Given this task:\n${taskLine(task)}\n\nDraft a short, professional message or email someone could send related to this task (e.g. asking for what's needed, or an update). Keep it under 80 words. Base it only on the task's own title/notes above.`,
  });
  return text;
}

export async function getOrGenerateDailyInsight(userId: string): Promise<string | null> {
  const cached = (await readCache(userId, "insight")) as { text: string } | null;
  if (cached) return cached.text;

  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const tasks = await prisma.task.findMany({
    where: { userId, status: { not: "DONE" }, archived: false, parentId: null },
    orderBy: [{ dueDate: "asc" }],
    take: 20,
  });
  if (tasks.length === 0) return null;

  const { text } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here are the user's open tasks:\n${tasks.map(taskLine).join("\n")}\n\nIn 1-2 sentences, give one practical, grounded piece of guidance for today - like what to tackle first or what's at risk. Base it only on the tasks listed.`,
  });

  await writeCache(userId, "insight", { text });
  return text;
}

export async function generateTaskReport(
  userId: string,
  period: ReportPeriod,
  periodStart: Date,
): Promise<TaskReportSummary | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const periodEnd = new Date(periodStart);
  if (period === "DAY") periodEnd.setDate(periodEnd.getDate() + 1);
  else if (period === "WEEK") periodEnd.setDate(periodEnd.getDate() + 7);
  else if (period === "MONTH") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const [created, completed] = await Promise.all([
    prisma.task.findMany({ where: { userId, createdAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.task.findMany({
      where: { userId, status: "DONE", completedAt: { gte: periodStart, lt: periodEnd } },
      include: { project: true },
    }),
  ]);

  const projectCounts = new Map<string, number>();
  for (const t of completed) {
    const label = t.project?.name ?? "No project";
    projectCounts.set(label, (projectCounts.get(label) ?? 0) + 1);
  }
  const topProjects = [...projectCounts.entries()]
    .map(([project, count]) => ({ project, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalCreated = created.length;
  const totalCompleted = completed.length;
  const completionRate = totalCreated > 0 ? totalCompleted / totalCreated : totalCompleted > 0 ? 1 : 0;

  const label = period.toLowerCase();
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here are the computed stats for this ${label} (${periodStart.toDateString()} - ${periodEnd.toDateString()}):\nTasks created: ${totalCreated}\nTasks completed: ${totalCompleted}\nCompletion rate: ${Math.round(completionRate * 100)}%\nTop projects completed in: ${topProjects.map((p) => `${p.project} (${p.count})`).join(", ") || "none"}\n\nWrite a grounded ${label}ly overview, up to 5 wins, up to 5 challenges, and up to 5 suggestions - based only on the numbers above.`,
    output: Output.object({ schema: taskReportNarrativeSchema }),
  });

  const narrative = taskReportNarrativeSchema.parse(output);
  const summary: TaskReportSummary = { totalCreated, totalCompleted, completionRate, topProjects, ...narrative };

  await prisma.taskReport.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    update: { summary },
    create: { userId, period, periodStart, summary },
  });

  return summary;
}
