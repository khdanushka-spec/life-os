"use client";

import { Plane, Globe2, Backpack, Heart } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export function TravelStatsRow({
  upcomingTrips,
  countriesVisited,
  packingItemsLeft,
  wishlistCount,
}: {
  upcomingTrips: number;
  countriesVisited: number;
  packingItemsLeft: number;
  wishlistCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={Plane} label="Upcoming Trips" value={upcomingTrips} accent="bg-primary" />
      <StatCard icon={Globe2} label="Countries Visited" value={countriesVisited} accent="bg-sky-500" />
      <StatCard icon={Backpack} label="Packing Items Left" value={packingItemsLeft} accent="bg-amber-500" />
      <StatCard icon={Heart} label="Wishlist" value={wishlistCount} accent="bg-rose-500" />
    </div>
  );
}
