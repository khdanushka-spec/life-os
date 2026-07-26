import "server-only";
import { generateText, Output } from "ai";
import { resolveAiModel } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { familyReportNarrativeSchema, daysUntilAnnualDate, type FamilyReportSummary } from "@/lib/family";
import { brisbaneToday } from "@/lib/date";
import type { ReportPeriod } from "@/generated/prisma/client";

const SYSTEM =
  "You are the family-and-relationships voice inside AURA OS - warm, direct, concise, never saccharine. " +
  "You only ever see the user's real logged data below - never invent a family member, event, or date " +
  "that isn't explicitly given to you.";

const todayDate = brisbaneToday;

async function readCache(userId: string, kind: string): Promise<unknown | null> {
  const cached = await prisma.familyAiCache.findUnique({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
  });
  return cached?.content ?? null;
}

async function writeCache(userId: string, kind: string, content: unknown) {
  await prisma.familyAiCache.upsert({
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

  const now = new Date();
  const twoWeeksAhead = new Date(now.getTime() + 14 * 86_400_000);

  const [members, upcomingEvents, openGiftIdeas] = await Promise.all([
    prisma.familyMember.findMany({ where: { userId, archived: false, birthday: { not: null } } }),
    prisma.familyEvent.findMany({
      where: { userId, date: { gte: now, lt: twoWeeksAhead } },
      include: { member: true },
      orderBy: { date: "asc" },
    }),
    prisma.giftIdea.findMany({ where: { userId, status: "IDEA" }, include: { member: true }, take: 20 }),
  ]);

  const upcomingBirthdays = members
    .map((m) => ({ name: m.name, days: daysUntilAnnualDate(m.birthday!, now) }))
    .filter((b) => b.days <= 14)
    .sort((a, b) => a.days - b.days);

  if (upcomingBirthdays.length === 0 && upcomingEvents.length === 0 && openGiftIdeas.length === 0) return null;

  const birthdayLines = upcomingBirthdays.map((b) => `- ${b.name} in ${b.days} day${b.days === 1 ? "" : "s"}`);
  const eventLines = upcomingEvents.map((e) => `- "${e.title}" on ${e.date.toDateString()}${e.member ? ` (${e.member.name})` : ""}`);
  const giftLines = openGiftIdeas.map((g) => `- ${g.title} for ${g.member.name}${g.occasion ? ` (${g.occasion})` : ""} - still just an idea, not purchased`);

  try {
    const { text } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Here is the user's family data for the next 14 days:\n\nUpcoming birthdays:\n${birthdayLines.join("\n") || "none"}\n\nUpcoming events:\n${eventLines.join("\n") || "none"}\n\nGift ideas not yet purchased:\n${giftLines.join("\n") || "none"}\n\nIn 1-2 sentences, give one practical, grounded piece of guidance for today - like someone's birthday coming up with no gift sorted yet, or an event worth preparing for. Base it only on the data listed.`,
    });
    await writeCache(userId, "insight", { text });
    return text;
  } catch {
    return null;
  }
}

export async function generateFamilyReport(
  userId: string,
  period: ReportPeriod,
  periodStart: Date,
): Promise<FamilyReportSummary | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const periodEnd = new Date(periodStart);
  if (period === "DAY") periodEnd.setDate(periodEnd.getDate() + 1);
  else if (period === "WEEK") periodEnd.setDate(periodEnd.getDate() + 7);
  else if (period === "MONTH") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const [events, giftsGiven, membersWithBirthday] = await Promise.all([
    prisma.familyEvent.findMany({ where: { userId, date: { gte: periodStart, lt: periodEnd } }, include: { member: true } }),
    prisma.giftIdea.count({ where: { userId, status: "GIVEN", updatedAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.familyMember.findMany({ where: { userId, archived: false, birthday: { not: null } } }),
  ]);

  const birthdaysInPeriod = membersWithBirthday.filter((m) => {
    const occurrence = new Date(Date.UTC(periodStart.getUTCFullYear(), m.birthday!.getUTCMonth(), m.birthday!.getUTCDate()));
    return occurrence >= periodStart && occurrence < periodEnd;
  }).length;

  const eventLines = events.map((e) => `- "${e.title}"${e.member ? ` (${e.member.name})` : ""} on ${e.date.toDateString()}`);

  const label = period.toLowerCase();
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here are the computed stats for this ${label} (${periodStart.toDateString()} - ${periodEnd.toDateString()}):
Events: ${events.length}
Birthdays in this period: ${birthdaysInPeriod}
Gifts given: ${giftsGiven}

Events logged:
${eventLines.join("\n") || "none"}

Write a grounded ${label}ly overview, up to 5 wins, up to 5 challenges, and up to 5 suggestions - based only on the data above.`,
    output: Output.object({ schema: familyReportNarrativeSchema }),
  });

  const narrative = familyReportNarrativeSchema.parse(output);
  const summary: FamilyReportSummary = {
    eventsInPeriod: events.length,
    birthdaysInPeriod,
    giftsGiven,
    ...narrative,
  };

  await prisma.familyReport.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    update: { summary },
    create: { userId, period, periodStart, summary },
  });

  return summary;
}
