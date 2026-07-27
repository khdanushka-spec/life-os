"use client";

import { Users2, Cake, CalendarClock, Gift } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export function FamilyStatsRow({
  totalMembers,
  upcomingBirthdays,
  upcomingEvents,
  openGiftIdeas,
}: {
  totalMembers: number;
  upcomingBirthdays: number;
  upcomingEvents: number;
  openGiftIdeas: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={Users2} label="Family Members" value={totalMembers} accent="bg-primary" />
      <StatCard icon={Cake} label="Upcoming Birthdays" value={upcomingBirthdays} accent="bg-rose-500" />
      <StatCard icon={CalendarClock} label="Upcoming Events" value={upcomingEvents} accent="bg-sky-500" />
      <StatCard icon={Gift} label="Open Gift Ideas" value={openGiftIdeas} accent="bg-amber-500" />
    </div>
  );
}
