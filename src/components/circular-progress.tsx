"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

const SIZE = 72;
const STROKE = 6;

export function CircularProgress({
  value,
  label,
  size = SIZE,
}: {
  value: number;
  label: string;
  size?: number;
}) {
  const gradientId = useId();
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-muted"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduceMotion ? offset : circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT }}
          />
        </svg>
        <span className="text-metric absolute inset-0 flex items-center justify-center text-sm">
          {clamped}%
        </span>
      </div>
      <span className="text-caption">{label}</span>
    </div>
  );
}
