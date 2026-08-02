import { z } from "zod";
import type { MealType, MedicalRecordType } from "@/generated/prisma/client";

export const WORKOUT_TYPE_PRESETS = [
  "Running", "Walking", "Cycling", "Gym / Weights", "Yoga",
  "Swimming", "Sports", "HIIT", "Stretching", "Other",
];

export const MEAL_TYPE_META: Record<MealType, { label: string; icon: string }> = {
  BREAKFAST: { label: "Breakfast", icon: "🍳" },
  LUNCH: { label: "Lunch", icon: "🥗" },
  DINNER: { label: "Dinner", icon: "🍽️" },
  SNACK: { label: "Snack", icon: "🍎" },
};

export const MEDICAL_RECORD_TYPE_META: Record<MedicalRecordType, { label: string; icon: string }> = {
  APPOINTMENT: { label: "Appointment", icon: "🩺" },
  PRESCRIPTION: { label: "Prescription", icon: "💊" },
  TEST: { label: "Test", icon: "🧪" },
  VACCINATION: { label: "Vaccination", icon: "💉" },
  NOTE: { label: "Note", icon: "📝" },
};

const WATER_GOAL_ML = 2000;
const SLEEP_GOAL_HOURS = 8;
const WORKOUT_GOAL_PER_WEEK = 4;

// Deterministic, documented weighted formula - never AI-guessed, same
// "AI narrates, math computes" principle as the rest of the app. Named
// distinctly from Finance's computeHealthScore (a financial-health
// metric, unrelated) to avoid confusion between the two.
// A metric that wasn't logged today defaults to a neutral 50 rather than
// 0, so an unlogged field doesn't tank the score the way a genuinely bad
// value would.
export interface WellnessBreakdown {
  hydrationScore: number;
  sleepScore: number;
  wellbeingPercent: number;
  exerciseScore: number;
  total: number;
}

// Same weights as computeWellnessScore, but exposes each sub-score for the
// Wellness Score detail page's breakdown view — computeWellnessScore below
// is now just `.total` from this, so existing callers see no change.
export function computeWellnessBreakdown(input: {
  waterMl: number | null;
  sleepHours: number | null;
  wellbeingScore: number | null;
  workoutsThisWeek: number;
}): WellnessBreakdown {
  const hydrationScore = input.waterMl != null ? Math.min(100, (input.waterMl / WATER_GOAL_ML) * 100) : 50;
  const sleepScore = input.sleepHours != null ? Math.min(100, (input.sleepHours / SLEEP_GOAL_HOURS) * 100) : 50;
  const wellbeingPercent = input.wellbeingScore != null ? input.wellbeingScore * 10 : 50;
  const exerciseScore = Math.min(100, (input.workoutsThisWeek / WORKOUT_GOAL_PER_WEEK) * 100);
  const total = Math.round(hydrationScore * 0.25 + sleepScore * 0.3 + wellbeingPercent * 0.25 + exerciseScore * 0.2);

  return {
    hydrationScore: Math.round(hydrationScore),
    sleepScore: Math.round(sleepScore),
    wellbeingPercent: Math.round(wellbeingPercent),
    exerciseScore: Math.round(exerciseScore),
    total,
  };
}

export function computeWellnessScore(input: {
  waterMl: number | null;
  sleepHours: number | null;
  wellbeingScore: number | null;
  workoutsThisWeek: number;
}): number {
  return computeWellnessBreakdown(input).total;
}

export function hydrationPercent(waterMl: number | null): number {
  if (waterMl == null) return 0;
  return Math.min(100, Math.round((waterMl / WATER_GOAL_ML) * 100));
}

export { WATER_GOAL_ML, SLEEP_GOAL_HOURS, WORKOUT_GOAL_PER_WEEK };

// The AI only ever fills in these narrative fields - every number in a
// report is computed separately and merged in, same principle as Work's/
// Finance's reports.
export const healthReportNarrativeSchema = z.object({
  overview: z.string(),
  wins: z.array(z.string()).max(5),
  challenges: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
});
export type HealthReportNarrative = z.infer<typeof healthReportNarrativeSchema>;

export type HealthReportSummary = HealthReportNarrative & {
  avgSleepHours: number | null;
  avgWaterMl: number | null;
  avgWellbeingScore: number | null;
  workoutsLogged: number;
  totalCaloriesBurned: number;
  weightChangeKg: number | null;
};
