"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
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

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  accent,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  suffix?: string;
  accent: string;
  /** When set, the whole card links to a detail page (e.g. a trend/breakdown view). */
  href?: string;
}) {
  const card = (
    <Card
      className={`relative overflow-hidden border-none bg-card/60 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5 ${href ? "h-full" : ""}`}
    >
      <div aria-hidden className={`pointer-events-none absolute inset-0 opacity-10 ${accent}`} />
      <CardContent className="relative flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p
          className={`font-semibold tracking-tight tabular-nums ${
            typeof value === "number" ? "text-3xl" : "text-lg"
          }`}
        >
          {typeof value === "number" ? <AnimatedNumber value={value} suffix={suffix} /> : value}
        </p>
      </CardContent>
    </Card>
  );

  if (!href) return card;
  return (
    <Link href={href} className="block">
      {card}
    </Link>
  );
}
