"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Flame, Trophy, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => `${Math.round(v)}${suffix}`);
  const hasMounted = useRef(false);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: hasMounted.current ? 0.6 : 0.9,
      ease: "easeOut",
    });
    hasMounted.current = true;
    return controls.stop;
  }, [value, motionValue]);

  return <motion.span>{display}</motion.span>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden border-none bg-card/60 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5">
      <div aria-hidden className={`pointer-events-none absolute inset-0 opacity-10 ${accent}`} />
      <CardContent className="relative flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          <AnimatedNumber value={value} suffix={suffix} />
        </p>
      </CardContent>
    </Card>
  );
}

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
