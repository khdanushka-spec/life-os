"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Archive, FileText, Link2, HelpCircle } from "lucide-react";
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

export function VaultStatsRow({
  totalItems,
  notes,
  links,
  uncategorized,
}: {
  totalItems: number;
  notes: number;
  links: number;
  uncategorized: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={Archive} label="Total Items" value={totalItems} accent="bg-primary" />
      <StatCard icon={FileText} label="Notes" value={notes} accent="bg-violet-500" />
      <StatCard icon={Link2} label="Links" value={links} accent="bg-sky-500" />
      <StatCard icon={HelpCircle} label="Uncategorized" value={uncategorized} accent="bg-amber-500" />
    </div>
  );
}
