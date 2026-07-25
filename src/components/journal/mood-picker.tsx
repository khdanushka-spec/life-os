"use client";

import { motion } from "framer-motion";
import { MOODS } from "@/lib/journal";
import type { Mood } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

export function MoodPicker({
  value,
  onChange,
}: {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {MOODS.map((m) => {
        const selected = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            aria-label={m.label}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : m.value)}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl border border-transparent p-2 transition-colors hover:bg-muted",
              selected && "bg-muted",
            )}
          >
            {selected && (
              <motion.span
                layoutId="mood-ring"
                className="absolute inset-0 rounded-xl ring-2 ring-primary"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <motion.span
              className="text-2xl"
              animate={selected ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              {m.emoji}
            </motion.span>
            <span className="text-[11px] text-muted-foreground">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
