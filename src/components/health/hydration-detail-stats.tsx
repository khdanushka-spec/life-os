"use client";

import { Droplet, CalendarCheck, Flame } from "lucide-react";
import { StatCard } from "@/components/stat-card";

// Icons are imported and rendered here, inside a "use client" file, rather
// than passed in as props from the (Server Component) page — a bare
// component reference like `icon={Droplet}` isn't serializable across the
// server/client boundary and crashes at runtime with no build-time warning
// (see aura-os HANDOVER.md's StatCard gotcha, hit twice already before this).
export function HydrationDetailStats({ average, daysGoalMet, streak }: { average: number; daysGoalMet: number; streak: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard icon={Droplet} label="Average" value={average} suffix="ml" accent="bg-sky-500" />
      <StatCard icon={CalendarCheck} label="Days goal met" value={daysGoalMet} accent="bg-sky-500" />
      <StatCard icon={Flame} label="Current streak" value={streak} suffix="d" accent="bg-sky-500" />
    </div>
  );
}
