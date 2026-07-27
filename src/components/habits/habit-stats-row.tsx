"use client";

import { Flame, Trophy, Sparkles, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export function HabitStatsRow({
  todayCompletionPercent,
  todayStreak,
  longestStreak,
  habitScore,
  consistency30,
}: {
  todayCompletionPercent: number;
  todayStreak: number;
  longestStreak: number;
  habitScore: number;
  consistency30: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        icon={Sparkles}
        label="Today's Completion"
        value={todayCompletionPercent}
        suffix="%"
        accent="bg-primary"
      />
      <StatCard icon={Flame} label="Today's Streak" value={todayStreak} accent="bg-orange-500" />
      <StatCard icon={Trophy} label="Longest Streak" value={longestStreak} accent="bg-amber-500" />
      <StatCard icon={TrendingUp} label="Habit Score" value={habitScore} suffix="%" accent="bg-emerald-500" />
      <StatCard icon={TrendingUp} label="Consistency" value={consistency30} suffix="%" accent="bg-sky-500" />
    </div>
  );
}
