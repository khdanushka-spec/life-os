"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { HeartPulse, Droplet, Moon, Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => `${Math.round(v)}${suffix}`);
  const hasMounted = useRef(false);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: hasMounted.current ? 0.6 : 0.9, ease: "easeOut" });
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
