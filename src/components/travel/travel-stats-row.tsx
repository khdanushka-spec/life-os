"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Plane, Globe2, Backpack, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => `${Math.round(v)}`);
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
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
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
          <AnimatedNumber value={value} />
        </p>
      </CardContent>
    </Card>
  );
}

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
