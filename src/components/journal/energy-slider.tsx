"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type EnergyValues = {
  morning: number | null;
  afternoon: number | null;
  evening: number | null;
};

const SEGMENTS: { key: keyof EnergyValues; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];

export function EnergySlider({
  value,
  onChange,
}: {
  value: EnergyValues;
  onChange: (value: EnergyValues) => void;
}) {
  const [active, setActive] = useState<keyof EnergyValues>("morning");
  const current = value[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1">
        {SEGMENTS.map((seg) => (
          <button
            key={seg.key}
            type="button"
            onClick={() => setActive(seg.key)}
            className={cn(
              "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
              active === seg.key
                ? "border-primary bg-primary/10 text-foreground"
                : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {seg.label}
            {value[seg.key] != null && (
              <span className="ml-1 text-muted-foreground">· {value[seg.key]}</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 px-1">
        <Slider
          min={1}
          max={10}
          step={1}
          value={current ?? 5}
          onValueChange={(v) =>
            onChange({ ...value, [active]: Array.isArray(v) ? v[0] : v })
          }
        />
        <span className="w-5 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
          {current ?? "–"}
        </span>
      </div>
    </div>
  );
}
