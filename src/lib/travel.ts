import { z } from "zod";
import type { TripStatus, BookingType } from "@/generated/prisma/client";

export const TRIP_STATUS_META: Record<TripStatus, { label: string; color: string }> = {
  PLANNING: { label: "Planning", color: "text-muted-foreground" },
  UPCOMING: { label: "Upcoming", color: "text-sky-600 dark:text-sky-400" },
  ONGOING: { label: "Ongoing", color: "text-emerald-600 dark:text-emerald-400" },
  COMPLETED: { label: "Completed", color: "text-muted-foreground" },
  CANCELLED: { label: "Cancelled", color: "text-destructive" },
};

export const BOOKING_TYPE_META: Record<BookingType, { label: string; icon: string }> = {
  FLIGHT: { label: "Flight", icon: "✈️" },
  HOTEL: { label: "Hotel", icon: "🏨" },
  CAR_RENTAL: { label: "Car Rental", icon: "🚗" },
  ACTIVITY: { label: "Activity", icon: "🎟️" },
  OTHER: { label: "Other", icon: "📌" },
};

export const PACKING_CATEGORY_PRESETS = ["Clothing", "Toiletries", "Electronics", "Documents", "Other"];

export function isWithinNextDays(date: Date, days: number, now: Date = new Date()): boolean {
  const end = new Date(now.getTime() + days * 86_400_000);
  return date >= now && date <= end;
}

export function formatTripDateRange(startDate: Date | null, endDate: Date | null): string | null {
  if (!startDate && !endDate) return null;
  const fmt = (d: Date) => d.toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
  return fmt((startDate ?? endDate)!);
}

// The AI only ever fills in these narrative fields - every number in a
// report is computed separately and merged in, same principle as
// Work's/Health's/Family's reports.
export const travelReportNarrativeSchema = z.object({
  overview: z.string(),
  wins: z.array(z.string()).max(5),
  challenges: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
});
export type TravelReportNarrative = z.infer<typeof travelReportNarrativeSchema>;

export type TravelReportSummary = TravelReportNarrative & {
  tripsInPeriod: number;
  bookingsMade: number;
  totalSpend: number;
};
