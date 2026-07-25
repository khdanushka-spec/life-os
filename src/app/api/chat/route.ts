import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { getAiProvider } from "@/lib/ai/config";
import { getDbUser } from "@/server/db-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const provider = getAiProvider();
  if (!provider) {
    return new Response(
      "AI isn't configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
      { status: 503 },
    );
  }

  const dbUser = await getDbUser();
  if (!dbUser) {
    return new Response("Unauthorized", { status: 401 });
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

  const system = `You are the AI Brain inside AURA OS, a calm, AI-first personal life-management app. Be concise, warm, and direct - this is a personal assistant, not a customer support bot.

You currently only have visibility into the user's pending tasks. Don't claim to know about their calendar, health, finances, or other life areas - those modules don't exist yet.

Their current pending tasks:
${taskSummary}`;

  const { messages }: { messages: UIMessage[] } = await req.json();

  const model =
    provider === "anthropic" ? anthropic("claude-sonnet-5") : openai("gpt-4o");

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
