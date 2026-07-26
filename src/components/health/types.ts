import type { MealType, MedicalRecordType } from "@/generated/prisma/client";

export type DailyHealthLogDetail = {
  date: string;
  weightKg: number | null;
  waterMl: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  wellbeingScore: number | null;
  note: string | null;
};

export type WorkoutDetail = {
  id: string;
  type: string;
  performedAt: Date;
  durationMinutes: number | null;
  caloriesBurned: number | null;
  notes: string | null;
};

export type NutritionDetail = {
  id: string;
  mealType: MealType;
  description: string;
  calories: number | null;
  loggedAt: Date;
};

export type MedicalRecordDetail = {
  id: string;
  type: MedicalRecordType;
  title: string;
  provider: string | null;
  notes: string | null;
  date: Date;
  followUpDate: Date | null;
};
