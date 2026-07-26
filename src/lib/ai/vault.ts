import "server-only";
import { generateText, Output } from "ai";
import { resolveAiModel } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { vaultReportNarrativeSchema, type VaultReportSummary } from "@/lib/vault";
import { brisbaneToday } from "@/lib/date";
import type { ReportPeriod } from "@/generated/prisma/client";

const SYSTEM =
  "You are the knowledge-vault voice inside AURA OS - direct, concise, a thoughtful librarian, not a hype " +
  "machine. You only ever see the user's real saved items below - never invent a note, link, or title that " +
  "isn't explicitly given to you.";

const todayDate = brisbaneToday;

async function readCache(userId: string, kind: string): Promise<unknown | null> {
  const cached = await prisma.vaultAiCache.findUnique({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
  });
  return cached?.content ?? null;
}

async function writeCache(userId: string, kind: string, content: unknown) {
  await prisma.vaultAiCache.upsert({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
    update: { content: content as object },
    create: { userId, date: todayDate(), kind, content: content as object },
  });
}

export async function getOrGenerateDailyInsight(userId: string): Promise<string | null> {
  const cached = (await readCache(userId, "insight")) as { text: string } | null;
  if (cached) return cached.text;

  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
  const [totalCount, uncategorizedCount, staleItems] = await Promise.all([
    prisma.vaultItem.count({ where: { userId } }),
    prisma.vaultItem.count({ where: { userId, category: null } }),
    prisma.vaultItem.findMany({
      where: { userId, updatedAt: { lt: ninetyDaysAgo } },
      orderBy: { updatedAt: "asc" },
      take: 5,
    }),
  ]);

  if (totalCount === 0) return null;

  const staleLines = staleItems.map((i) => `- "${i.title}" (${i.type.toLowerCase()}), last touched ${i.updatedAt.toDateString()}`);

  try {
    const { text } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Here is the state of the user's knowledge vault:\n\nTotal items: ${totalCount}\nUncategorized items: ${uncategorizedCount}\n\nItems not touched in 90+ days:\n${staleLines.join("\n") || "none"}\n\nIn 1-2 sentences, give one practical, grounded piece of guidance for today - like an old item worth revisiting or a backlog of uncategorized items worth sorting. Base it only on the data listed.`,
    });
    await writeCache(userId, "insight", { text });
    return text;
  } catch {
    return null;
  }
}

export async function generateVaultReport(
  userId: string,
  period: ReportPeriod,
  periodStart: Date,
): Promise<VaultReportSummary | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const periodEnd = new Date(periodStart);
  if (period === "DAY") periodEnd.setDate(periodEnd.getDate() + 1);
  else if (period === "WEEK") periodEnd.setDate(periodEnd.getDate() + 7);
  else if (period === "MONTH") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const items = await prisma.vaultItem.findMany({ where: { userId, createdAt: { gte: periodStart, lt: periodEnd } } });

  const notesAdded = items.filter((i) => i.type === "NOTE").length;
  const linksAdded = items.filter((i) => i.type === "LINK").length;
  const itemLines = items.map((i) => `- "${i.title}" (${i.type.toLowerCase()})${i.category ? ` [${i.category}]` : ""}`);

  const label = period.toLowerCase();
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here are the computed stats for this ${label} (${periodStart.toDateString()} - ${periodEnd.toDateString()}):
Items added: ${items.length}
Notes added: ${notesAdded}
Links added: ${linksAdded}

Items:
${itemLines.join("\n") || "none"}

Write a grounded ${label}ly overview, up to 5 wins, up to 5 challenges, and up to 5 suggestions - based only on the data above.`,
    output: Output.object({ schema: vaultReportNarrativeSchema }),
  });

  const narrative = vaultReportNarrativeSchema.parse(output);
  const summary: VaultReportSummary = {
    itemsAdded: items.length,
    notesAdded,
    linksAdded,
    ...narrative,
  };

  await prisma.vaultReport.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    update: { summary },
    create: { userId, period, periodStart, summary },
  });

  return summary;
}
