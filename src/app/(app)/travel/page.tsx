import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { buttonVariants } from "@/components/ui/button";
import { getOrGenerateDailyInsight } from "@/lib/ai/travel";
import { TravelHeader } from "@/components/travel/travel-header";
import { TravelStatsRow } from "@/components/travel/travel-stats-row";
import { TripBoard } from "@/components/travel/trip-board";
import { TravelInsightCard } from "@/components/travel/travel-insight-card";
import { WishlistQuickList } from "@/components/travel/wishlist-quick-list";
import type { TripSummary } from "@/components/travel/types";

const SUB_PAGES = [
  { href: "/travel/wishlist", label: "Wishlist" },
  { href: "/travel/reports", label: "Reports" },
];

export default async function TravelPage() {
  const dbUser = await requireDbUser();

  const [trips, wishlist, packingItemsLeft, dailyInsight] = await Promise.all([
    prisma.trip.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: { bookings: true, packingItems: true },
    }),
    prisma.wishlistDestination.findMany({ where: { userId: dbUser.id }, orderBy: [{ starred: "desc" }, { createdAt: "desc" }] }),
    prisma.packingItem.count({ where: { userId: dbUser.id, packed: false } }),
    getOrGenerateDailyInsight(dbUser.id),
  ]);

  const tripSummaries: TripSummary[] = trips.map((t) => ({
    id: t.id,
    destination: t.destination,
    country: t.country,
    startDate: t.startDate,
    endDate: t.endDate,
    status: t.status,
    budget: t.budget ? Number(t.budget) : null,
    notes: t.notes,
    bookingCount: t.bookings.length,
    packedCount: t.packingItems.filter((p) => p.packed).length,
    packingCount: t.packingItems.length,
  }));

  const upcomingTripsCount = trips.filter((t) => t.status === "UPCOMING" || t.status === "ONGOING").length;
  const countriesVisited = new Set(trips.filter((t) => t.status === "COMPLETED" && t.country).map((t) => t.country)).size;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <TravelHeader />

      <div className="flex flex-wrap gap-2">
        {SUB_PAGES.map((p) => (
          <Link key={p.href} href={p.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {p.label}
          </Link>
        ))}
      </div>

      <TravelStatsRow
        upcomingTrips={upcomingTripsCount}
        countriesVisited={countriesVisited}
        packingItemsLeft={packingItemsLeft}
        wishlistCount={wishlist.length}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <TripBoard trips={tripSummaries} />
        <div className="flex flex-col gap-6">
          <TravelInsightCard insight={dailyInsight} />
          <WishlistQuickList destinations={wishlist.map((w) => ({ id: w.id, destination: w.destination, country: w.country, starred: w.starred }))} />
        </div>
      </div>
    </div>
  );
}
