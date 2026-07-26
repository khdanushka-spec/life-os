import "server-only";
import { generateText, Output } from "ai";
import { resolveAiModel } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { workReportNarrativeSchema, type WorkReportSummary } from "@/lib/work";
import { brisbaneToday } from "@/lib/date";
import type { ReportPeriod } from "@/generated/prisma/client";

const SYSTEM =
  "You are the work-planning voice inside AURA OS - direct, concise, practical. " +
  "You only ever see the user's real project/client/meeting data below. Never invent " +
  "a project, deadline, client, or fact that isn't explicitly given to you.";

const todayDate = brisbaneToday;

async function readCache(userId: string, kind: string): Promise<unknown | null> {
  const cached = await prisma.workAiCache.findUnique({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
  });
  return cached?.content ?? null;
}

async function writeCache(userId: string, kind: string, content: unknown) {
  await prisma.workAiCache.upsert({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
    update: { content: content as object },
    create: { userId, date: todayDate(), kind, content: content as object },
  });
}

// Runs unconditionally on every /work page load - a bare AI-call failure
// here must not crash the whole page, so this fails soft to null like
// every other AI feature in the app.
export async function getOrGenerateDailyInsight(userId: string): Promise<string | null> {
  const cached = (await readCache(userId, "insight")) as { text: string } | null;
  if (cached) return cached.text;

  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 86_400_000);

  const [projects, meetings] = await Promise.all([
    prisma.project.findMany({
      where: { userId, kind: "WORK", archived: false, status: { in: ["ACTIVE", "ON_HOLD"] } },
      include: { client: true },
      orderBy: { deadline: "asc" },
      take: 20,
    }),
    prisma.meeting.findMany({
      where: { userId, startTime: { gte: now, lt: soon } },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
  ]);

  if (projects.length === 0 && meetings.length === 0) return null;

  const projectLines = projects.map((p) => {
    const bits = [
      `status: ${p.status}`,
      p.deadline ? `deadline ${p.deadline.toDateString()}${p.deadline < now ? " (overdue)" : ""}` : "no deadline",
      p.client ? `client: ${p.client.name}` : null,
    ].filter(Boolean);
    return `- "${p.name}" - ${bits.join(", ")}`;
  });
  const meetingLines = meetings.map((m) => `- "${m.title}" at ${m.startTime.toLocaleString()}`);

  try {
    const { text } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Here are the user's active work projects:\n${projectLines.join("\n") || "none"}\n\nMeetings in the next 3 days:\n${meetingLines.join("\n") || "none"}\n\nIn 1-2 sentences, give one practical, grounded piece of guidance for today - like a deadline at risk or a meeting to prepare for. Base it only on the data listed.`,
    });
    await writeCache(userId, "insight", { text });
    return text;
  } catch {
    return null;
  }
}

export async function generateWorkReport(
  userId: string,
  period: ReportPeriod,
  periodStart: Date,
): Promise<WorkReportSummary | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const periodEnd = new Date(periodStart);
  if (period === "DAY") periodEnd.setDate(periodEnd.getDate() + 1);
  else if (period === "WEEK") periodEnd.setDate(periodEnd.getDate() + 7);
  else if (period === "MONTH") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const [completedProjects, activeProjects, meetings] = await Promise.all([
    prisma.project.findMany({
      where: { userId, kind: "WORK", status: "COMPLETED", updatedAt: { gte: periodStart, lt: periodEnd } },
      include: { client: true },
    }),
    prisma.project.count({ where: { userId, kind: "WORK", status: "ACTIVE", archived: false } }),
    prisma.meeting.findMany({
      where: { userId, startTime: { gte: periodStart, lt: periodEnd } },
      include: { client: true, project: { include: { client: true } } },
    }),
  ]);

  // Best-effort: Project has no completedAt, so "met" compares the
  // deadline against when the project's status last changed (updatedAt).
  const deadlinesMet = completedProjects.filter((p) => !p.deadline || p.updatedAt <= p.deadline).length;
  const deadlinesMissed = completedProjects.length - deadlinesMet;

  const now = new Date();
  const meetingsHeld = meetings.filter((m) => m.startTime < now).length;

  const clientCounts = new Map<string, number>();
  for (const p of completedProjects) {
    if (p.client) clientCounts.set(p.client.name, (clientCounts.get(p.client.name) ?? 0) + 1);
  }
  for (const m of meetings) {
    const name = m.client?.name ?? m.project?.client?.name;
    if (name) clientCounts.set(name, (clientCounts.get(name) ?? 0) + 1);
  }
  const topClients = [...clientCounts.entries()]
    .map(([client, count]) => ({ client, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const label = period.toLowerCase();
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here are the computed stats for this ${label} (${periodStart.toDateString()} - ${periodEnd.toDateString()}):
Projects completed: ${completedProjects.length}
Currently active projects: ${activeProjects}
Deadlines met: ${deadlinesMet}
Deadlines missed: ${deadlinesMissed}
Meetings held: ${meetingsHeld}
Top clients: ${topClients.map((c) => `${c.client} (${c.count})`).join(", ") || "none"}

Write a grounded ${label}ly overview, up to 5 wins, up to 5 challenges, and up to 5 suggestions - based only on the numbers above.`,
    output: Output.object({ schema: workReportNarrativeSchema }),
  });

  const narrative = workReportNarrativeSchema.parse(output);
  const summary: WorkReportSummary = {
    projectsCompleted: completedProjects.length,
    projectsActive: activeProjects,
    deadlinesMet,
    deadlinesMissed,
    meetingsHeld,
    topClients,
    ...narrative,
  };

  await prisma.workReport.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    update: { summary },
    create: { userId, period, periodStart, summary },
  });

  return summary;
}
