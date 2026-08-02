"use client";

import { Moon, Star } from "lucide-react";
import { StatCard } from "@/components/stat-card";

// Same reasoning as HydrationDetailStats — icons must be imported and
// rendered inside a "use client" file, not passed in from the Server
// Component page.
export function SleepDetailStats({ averageHours, averageQuality }: { averageHours: number; averageQuality: number | null }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard icon={Moon} label="Average sleep" value={averageHours} suffix="h" accent="bg-indigo-500" />
      <StatCard
        icon={Star}
        label="Average quality"
        value={averageQuality ?? "–"}
        suffix={averageQuality != null ? "/5" : ""}
        accent="bg-indigo-500"
      />
    </div>
  );
}
