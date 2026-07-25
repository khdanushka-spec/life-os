import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { resolveAiModel } from "@/lib/ai/providers";
import { getDbUser } from "@/server/db-user";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/habits";
import { moodMeta } from "@/lib/journal";

export async function POST(req: Request) {
  const dbUser = await getDbUser();
  if (!dbUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resolved = await resolveAiModel();
  if (!resolved) {
    return new Response(
      "No AI provider available. Start Ollama (localhost:11434), or set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
      { status: 503 },
    );
  }

  const tasks = await prisma.task.findMany({
    where: { userId: dbUser.id, status: "TODO" },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 20,
  });

  const taskSummary = tasks.length
    ? tasks
        .map((t) => `- ${t.title}${t.dueDate ? ` (due ${t.dueDate.toDateString()})` : ""}`)
        .join("\n")
    : "No pending tasks right now.";

  const habits = await prisma.habit.findMany({
    where: { userId: dbUser.id, archived: false },
    include: { logs: { where: { date: new Date(todayDateKey()) } } },
  });
  const habitSummary = habits.length
    ? habits
        .map((h) => `- ${h.title}: ${h.logs.length > 0 ? "done today" : "not done yet today"}`)
        .join("\n")
    : "No habits being tracked right now.";

  const journalEntries = await prisma.journalEntry.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const journalSummary = journalEntries.length
    ? journalEntries
        .map((e) => {
          const mood = moodMeta(e.mood);
          const preview = e.content.length > 200 ? `${e.content.slice(0, 200)}...` : e.content;
          return `- ${e.createdAt.toDateString()}${mood ? ` (feeling ${mood.label.toLowerCase()})` : ""}: ${preview}`;
        })
        .join("\n")
    : "No journal entries yet.";

  const system = `You are the AI Brain inside AURA OS, a calm, AI-first personal life-management app. Be concise, warm, and direct - this is a personal assistant, not a customer support bot.

You currently only have visibility into the user's pending tasks, daily habits, and recent journal entries. Don't claim to know about their calendar, health metrics, finances, or other life areas - those modules don't exist yet.

Their current pending tasks:
${taskSummary}

Their habits and today's status:
${habitSummary}

Their recent journal entries (most recent first):
${journalSummary}`;

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: resolved.model,
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
