"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CircularProgress } from "@/components/circular-progress";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type MomentumItem = {
  label: string;
  value: number;
  trend?: number | null;
};

export function MomentumRings({ items }: { items: MomentumItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Momentum</CardTitle>
        <CardDescription>How today is tracking, area by area</CardDescription>
      </CardHeader>
      <CardContent>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-wrap justify-around gap-6"
        >
          {items.map((item) => (
            <motion.div key={item.label} variants={fadeInUp} className="flex flex-col items-center gap-1.5">
              <CircularProgress value={item.value} label={item.label} />
              {item.trend != null && item.trend !== 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[11px] font-medium",
                    item.trend > 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {item.trend > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                  {Math.abs(item.trend)}%
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
