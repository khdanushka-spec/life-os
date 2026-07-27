import { Prisma, type Mood, type ReportPeriod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { computeStreak } from "@/lib/habits";
import { fallbackPromptsForToday, wordCount, journalReportSchema } from "@/lib/journal";
import { getOrGenerateReflection, getOrGenerateInsights } from "@/lib/ai/journal";
import { getBrisbaneWeather } from "@/lib/weather";
import { startOfWeek, startOfMonth, startOfBrisbaneDay, brisbaneDateKey } from "@/lib/date";

import { JournalHeader } from "@/components/journal/journal-header";
import { TodayCard } from "@/components/journal/today-card";
import { JournalComposer } from "@/components/journal/journal-composer";
import { EntryList } from "@/components/journal/entry-list";
import { JournalSearch, type JournalSearchParams } from "@/components/journal/journal-search";
import { AiInsights } from "@/components/journal/ai-insights";
import { Memories } from "@/components/journal/memories";
import { JournalCalendar } from "@/components/journal/journal-calendar";
import { JournalStats } from "@/components/journal/journal-stats";
import { WeeklyReport } from "@/components/journal/weekly-report";

// dateStr is always a Brisbane calendar date (either "today" via
// brisbaneDateKey(), or a ?date= param from the Brisbane-keyed calendar
// links) - resolve it to the actual Brisbane-day instant range, not the
// server's (UTC) midnight-to-midnight.
function dayRange(dateStr: string): { gte: Date; lt: Date } {
  const start = startOfBrisbaneDay(new Date(`${dateStr}T00:00:00Z`));
  const end = new Date(start.getTime() + 86_400_000);
  return { gte: start, lt: end };
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    mood?: string;
    tag?: string;
    from?: string;
    to?: string;
    date?: string;
    month?: string;
  }>;
}) {
  const params = await searchParams;
  const dbUser = await requireDbUser();
  const userId = dbUser.id;

  const where: Prisma.JournalEntryWhereInput = { userId };
  if (params.q) where.contentText = { contains: params.q, mode: "insensitive" };
  if (params.mood) where.mood = params.mood as Mood;
  if (params.tag) where.tags = { has: params.tag };
  if (params.date) {
    where.createdAt = dayRange(params.date);
  } else if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(`${params.from}T00:00:00`) } : {}),
      ...(params.to ? { lt: new Date(new Date(`${params.to}T00:00:00`).getTime() + 86_400_000) } : {}),
    };
  }
  const hasFilters = Boolean(params.q || params.mood || params.tag || params.from || params.to || params.date);

  const weekStart = startOfWeek(new Date());
  const monthStart = startOfMonth(new Date());

  // None of these depend on each other's results (the two AI helpers only
  // need userId, already known) - one Promise.all instead of three
  // sequential ones removes two rounds of avoidable serialization.
  const [entries, allDateRows, todayEntry, weather, reflection, insights, weeklyReportRow, monthlyReportRow] =
    await Promise.all([
      prisma.journalEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.journalEntry.findMany({ where: { userId }, select: { createdAt: true, contentText: true } }),
      prisma.journalEntry.findFirst({
        where: { userId, createdAt: dayRange(brisbaneDateKey()) },
        orderBy: { createdAt: "desc" },
      }),
      getBrisbaneWeather(),
      getOrGenerateReflection(userId),
      getOrGenerateInsights(userId),
      prisma.journalReport.findUnique({
        where: { userId_period_periodStart: { userId, period: "WEEK" as ReportPeriod, periodStart: weekStart } },
      }),
      prisma.journalReport.findUnique({
        where: { userId_period_periodStart: { userId, period: "MONTH" as ReportPeriod, periodStart: monthStart } },
      }),
    ]);

  const dateKeys = new Set(allDateRows.map((e) => brisbaneDateKey(e.createdAt)));
  const streak = computeStreak(dateKeys);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const entriesThisWeek = allDateRows.filter((e) => e.createdAt >= weekAgo).length;

  const todayKey = brisbaneDateKey();
  const wordsToday = allDateRows
    .filter((e) => brisbaneDateKey(e.createdAt) === todayKey)
    .reduce((sum, e) => sum + wordCount(e.contentText), 0);

  const todayEnergy = todayEntry?.energyEvening ?? todayEntry?.energyAfternoon ?? todayEntry?.energyMorning ?? null;

  const searchParamsForFilters: JournalSearchParams = params;
  const name = dbUser.username ?? dbUser.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <JournalHeader weather={weather} todayMood={todayEntry?.mood ?? null} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <TodayCard
            name={name}
            streak={streak}
            entriesThisWeek={entriesThisWeek}
            wordsToday={wordsToday}
            todayMood={todayEntry?.mood ?? null}
            todayEnergy={todayEnergy}
            reflection={reflection}
          />

          <div className="rounded-2xl border bg-card p-4 md:p-5">
            <JournalComposer initialEntry={todayEntry} promptFallbacks={fallbackPromptsForToday()} />
          </div>

          <JournalSearch params={searchParamsForFilters} />

          {hasFilters && (
            <p className="text-xs text-muted-foreground">
              {entries.length} {entries.length === 1 ? "result" : "results"}
            </p>
          )}
          <EntryList entries={entries.filter((e) => e.id !== todayEntry?.id || hasFilters)} />
        </div>

        <div className="flex flex-col gap-6">
          <AiInsights initialInsights={insights} />
          <Memories userId={userId} />
          <JournalCalendar userId={userId} monthParam={params.month} selectedDate={params.date} />
          <JournalStats userId={userId} />
          <WeeklyReport
            period="WEEK"
            periodStart={weekStart.toISOString()}
            initialReport={
              weeklyReportRow ? journalReportSchema.parse(weeklyReportRow.summary) : null
            }
          />
          <WeeklyReport
            period="MONTH"
            periodStart={monthStart.toISOString()}
            initialReport={
              monthlyReportRow ? journalReportSchema.parse(monthlyReportRow.summary) : null
            }
          />
        </div>
      </div>
    </div>
  );
}
