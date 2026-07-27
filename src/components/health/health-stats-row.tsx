"use client";

import { HeartPulse, Droplet, Moon, Dumbbell } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export function HealthStatsRow({
  wellnessScore,
  hydrationPercent,
  sleepHoursLastNight,
  workoutsThisWeek,
}: {
  wellnessScore: number;
  hydrationPercent: number;
  sleepHoursLastNight: number | null;
  workoutsThisWeek: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={HeartPulse} label="Wellness Score" value={wellnessScore} suffix="%" accent="bg-rose-500" />
      <StatCard icon={Droplet} label="Hydration" value={hydrationPercent} suffix="%" accent="bg-sky-500" />
      <StatCard icon={Moon} label="Sleep Last Night" value={sleepHoursLastNight ?? 0} suffix="h" accent="bg-indigo-500" />
      <StatCard icon={Dumbbell} label="Workouts This Week" value={workoutsThisWeek} accent="bg-emerald-500" />
    </div>
  );
}
