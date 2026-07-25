import type {
  HabitDifficulty,
  HabitGoalType,
  HabitPriority,
  HabitSchedule,
  HabitTimeOfDay,
} from "@/generated/prisma/client";

export type HabitCategoryOption = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

export type HabitWithStats = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  category: HabitCategoryOption | null;
  timeOfDay: HabitTimeOfDay;
  schedule: HabitSchedule;
  customDays: number[];
  goalType: HabitGoalType;
  targetCount: number | null;
  targetUnit: string | null;
  estimatedMinutes: number | null;
  difficulty: HabitDifficulty;
  priority: HabitPriority;
  motivation: string | null;
  reward: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
  createdAt: Date;
  doneToday: boolean;
  todayValue: number | null;
  todayNote: string | null;
  streak: number;
  longestStreak: number;
  successRate: number;
};
