import "server-only";
import { generateText, Output } from "ai";
import { resolveAiModel } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { travelReportNarrativeSchema, type TravelReportSummary } from "@/lib/travel";
import { brisbaneToday } from "@/lib/date";
import type { ReportPeriod } from "@/generated/prisma/client";

const SYSTEM =
  "You are the travel-planning voice inside AURA OS - practical, concise, a little excited about the trip. " +
  "You only ever see the user's real logged data below - never invent a trip, booking, or date that isn't " +
  "explicitly given to you.";

const todayDate = brisbaneToday;

async function readCache(userId: string, kind: string): Promise<unknown | null> {
  const cached = await prisma.travelAiCache.findUnique({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
  });
  return cached?.content ?? null;
}

async function writeCache(userId: string, kind: string, content: unknown) {
  await prisma.travelAiCache.upsert({
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
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 86_400_000);

  const upcomingTrips = await prisma.trip.findMany({
    where: {
      userId,
      status: { in: ["PLANNING", "UPCOMING"] },
      startDate: { gte: now, lt: thirtyDaysAhead },
    },
    include: { bookings: true, packingItems: true },
    orderBy: { startDate: "asc" },
  });

  if (upcomingTrips.length === 0) return null;

  const tripLines = upcomingTrips.map((t) => {
    const daysAway = Math.round((t.startDate!.getTime() - now.getTime()) / 86_400_000);
    const hasFlight = t.bookings.some((b) => b.type === "FLIGHT");
    const hasHotel = t.bookings.some((b) => b.type === "HOTEL");
    const packedCount = t.packingItems.filter((p) => p.packed).length;
    const bits = [
      `in ${daysAway} day${daysAway === 1 ? "" : "s"}`,
      hasFlight ? "flight booked" : "no flight booked yet",
      hasHotel ? "hotel booked" : "no hotel booked yet",
      t.packingItems.length ? `packing ${packedCount}/${t.packingItems.length}` : "no packing list started",
    ];
    return `- ${t.destination} - ${bits.join(", ")}`;
  });

  try {
    const { text } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Here are the user's trips in the next 30 days:\n\n${tripLines.join("\n")}\n\nIn 1-2 sentences, give one practical, grounded piece of guidance for today - like a booking still missing or packing worth starting. Base it only on the data listed.`,
    });
    await writeCache(userId, "insight", { text });
    return text;
  } catch {
    return null;
  }
}

export async function generateTravelReport(
  userId: string,
  period: ReportPeriod,
  periodStart: Date,
): Promise<TravelReportSummary | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const periodEnd = new Date(periodStart);
  if (period === "DAY") periodEnd.setDate(periodEnd.getDate() + 1);
  else if (period === "WEEK") periodEnd.setDate(periodEnd.getDate() + 7);
  else if (period === "MONTH") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const [trips, bookings] = await Promise.all([
    prisma.trip.findMany({ where: { userId, startDate: { gte: periodStart, lt: periodEnd } } }),
    prisma.booking.findMany({ where: { userId, createdAt: { gte: periodStart, lt: periodEnd } } }),
  ]);

  const totalSpend = bookings.reduce((sum, b) => sum + (b.cost ? Number(b.cost) : 0), 0);
  const tripLines = trips.map((t) => `- ${t.destination}${t.country ? `, ${t.country}` : ""} (${t.status})`);

  const label = period.toLowerCase();
  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here are the computed stats for this ${label} (${periodStart.toDateString()} - ${periodEnd.toDateString()}):
Trips starting in this period: ${trips.length}
Bookings made: ${bookings.length}
Total spend on bookings: $${totalSpend.toFixed(2)}

Trips:
${tripLines.join("\n") || "none"}

Write a grounded ${label}ly overview, up to 5 wins, up to 5 challenges, and up to 5 suggestions - based only on the data above.`,
    output: Output.object({ schema: travelReportNarrativeSchema }),
  });

  const narrative = travelReportNarrativeSchema.parse(output);
  const summary: TravelReportSummary = {
    tripsInPeriod: trips.length,
    bookingsMade: bookings.length,
    totalSpend,
    ...narrative,
  };

  await prisma.travelReport.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    update: { summary },
    create: { userId, period, periodStart, summary },
  });

  return summary;
}
