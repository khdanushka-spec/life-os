import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { resolveAiModel } from "@/lib/ai/providers";
import { getDbUser } from "@/server/db-user";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/habits";
import { moodMeta } from "@/lib/journal";
import { startOfMonth } from "@/lib/date";
import { computeNetWorth, decToNumber, formatCurrency, occurrencesInRange } from "@/lib/finance";
import { PRIORITY_META } from "@/lib/tasks";

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
    where: { userId: dbUser.id, parentId: null, status: { notIn: ["DONE"] } },
    include: { project: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 20,
  });

  const nowForTasks = new Date();
  const taskSummary = tasks.length
    ? tasks
        .map((t) => {
          const bits = [
            `[${PRIORITY_META[t.priority].label}]`,
            t.dueDate
              ? `due ${t.dueDate.toDateString()}${t.dueDate < nowForTasks ? " (overdue)" : ""}`
              : "no due date",
            t.project ? `project: ${t.project.name}` : null,
            t.energy ? `energy: ${t.energy}` : null,
          ]
            .filter(Boolean)
            .join(", ");
          return `- ${t.title} - ${bits}`;
        })
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
          const preview =
            e.contentText.length > 200 ? `${e.contentText.slice(0, 200)}...` : e.contentText;
          const tags = e.tags.length ? ` [${e.tags.join(", ")}]` : "";
          const gratitude = e.gratitude.length ? ` Grateful for: ${e.gratitude.join("; ")}.` : "";
          return `- ${e.createdAt.toDateString()}${mood ? ` (feeling ${mood.label.toLowerCase()})` : ""}${tags}: ${preview || "(no text)"}${gratitude}`;
        })
        .join("\n")
    : "No journal entries yet.";

  const monthStart = startOfMonth(new Date());
  const [accounts, investments, assetsLiabilities, budgets, monthExpenses, upcomingBills] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId: dbUser.id, archived: false } }),
    prisma.investment.findMany({ where: { userId: dbUser.id } }),
    prisma.assetLiability.findMany({ where: { userId: dbUser.id } }),
    prisma.budget.findMany({ where: { userId: dbUser.id, month: monthStart } }),
    prisma.transaction.findMany({ where: { userId: dbUser.id, type: "EXPENSE", date: { gte: monthStart } } }),
    prisma.recurringPayment.findMany({ where: { userId: dbUser.id, active: true } }),
  ]);

  const { netWorth } = computeNetWorth({
    accounts: accounts.map((a) => ({ type: a.type, balance: decToNumber(a.balance) })),
    investments: investments.map((i) => ({ currentValue: decToNumber(i.currentValue) })),
    assetsLiabilities: assetsLiabilities.map((a) => ({ kind: a.kind, value: decToNumber(a.value) })),
  });

  const spendByCategory: Record<string, number> = {};
  for (const t of monthExpenses) {
    spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + decToNumber(t.amount);
  }
  const budgetSummary = budgets.length
    ? budgets
        .map((b) => `- ${b.category}: ${formatCurrency(spendByCategory[b.category] ?? 0)} of ${formatCurrency(decToNumber(b.monthlyLimit))} budgeted`)
        .join("\n")
    : "No budgets set this month.";

  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const now = new Date();
  const upcomingLines = upcomingBills
    .flatMap((r) => occurrencesInRange(r.nextDueDate, r.interval, now, in7Days).map((date) => ({ r, date })))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ r, date }) => `- ${r.name}: ${formatCurrency(decToNumber(r.amount))} due ${date.toDateString()}`);
  const upcomingSummary = upcomingLines.length ? upcomingLines.join("\n") : "No bills due in the next 7 days.";

  const system = `You are Aura Brain inside AURA OS, a calm, AI-first personal life-management app. Be concise, warm, and direct - this is a personal assistant, not a customer support bot.

You currently only have visibility into the user's pending tasks, daily habits, recent journal entries, and finances. Don't claim to know about their calendar, health metrics, or other life areas - those modules don't exist yet.

CRITICAL for finance: only ever state the numbers given to you below. Never estimate, guess, or invent a dollar figure, balance, or trend that isn't explicitly present in this context.

Their current pending tasks:
${taskSummary}

Their habits and today's status:
${habitSummary}

Their recent journal entries (most recent first):
${journalSummary}

Their net worth: ${formatCurrency(netWorth)}

Their budgets this month:
${budgetSummary}

Bills due in the next 7 days:
${upcomingSummary}`;

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: resolved.model,
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
