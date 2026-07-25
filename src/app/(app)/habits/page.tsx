import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { brisbaneDateKey } from "@/lib/date";
import {
  todayDateKey,
  isScheduledForDate,
  computeHabitStreak,
  computeLongestStreak,
  computeSuccessRate,
  computeConsistency30,
  computePerfectDayStreak,
  computeHabitScore,
  computeWeekdayVsWeekend,
  generateInsights,
  type HabitConsistencyInput,
} from "@/lib/habits";
import { HabitsHeader } from "@/components/habits/habits-header";
import { HabitStatsRow } from "@/components/habits/habit-stats-row";
import { TodayHabits } from "@/components/habits/today-habits";
import { DailyMotivation } from "@/components/habits/daily-motivation";
import { AchievementsStrip } from "@/components/habits/achievements-strip";
import type { HabitCategoryOption, HabitWithStats } from "@/components/habits/types";
import type { AchievementKey } from "@/lib/habits";

export default async function HabitsPage() {
  const dbUser = await requireDbUser();

  const [habits, categories, unlockedAchievements] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: dbUser.id, archived: false },
      orderBy: { createdAt: "asc" },
      include: { logs: true, category: true },
    }),
    prisma.habitCategory.findMany({ where: { userId: dbUser.id }, orderBy: { name: "asc" } }),
    prisma.habitAchievement.findMany({ where: { userId: dbUser.id } }),
  ]);

  const todayKey = todayDateKey();
  const consistencyInputs: HabitConsistencyInput[] = [];

  const habitsWithStats: HabitWithStats[] = habits.map((habit) => {
    const logDateKeys = new Set(habit.logs.map((log) => log.date.toISOString().slice(0, 10)));
    const createdAtKey = brisbaneDateKey(habit.createdAt);
    const shape = { schedule: habit.schedule, customDays: habit.customDays };
    consistencyInputs.push({ ...shape, createdAtKey, logDateKeys });

    const todayLog = habit.logs.find((log) => log.date.toISOString().slice(0, 10) === todayKey);

    return {
      id: habit.id,
      title: habit.title,
      description: habit.description,
      icon: habit.icon,
      color: habit.color,
      category: habit.category
        ? {
            id: habit.category.id,
            name: habit.category.name,
            color: habit.category.color,
            icon: habit.category.icon,
          }
        : null,
      timeOfDay: habit.timeOfDay,
      schedule: habit.schedule,
      customDays: habit.customDays,
      goalType: habit.goalType,
      targetCount: habit.targetCount,
      targetUnit: habit.targetUnit,
      estimatedMinutes: habit.estimatedMinutes,
      difficulty: habit.difficulty,
      priority: habit.priority,
      motivation: habit.motivation,
      reward: habit.reward,
      reminderEnabled: habit.reminderEnabled,
      reminderTime: habit.reminderTime,
      createdAt: habit.createdAt,
      doneToday: Boolean(todayLog),
      todayValue: todayLog?.value ?? null,
      todayNote: todayLog?.note ?? null,
      streak: computeHabitStreak(shape, logDateKeys),
      longestStreak: computeLongestStreak(shape, logDateKeys, createdAtKey),
      successRate: computeSuccessRate(shape, logDateKeys, createdAtKey),
    };
  });

  const scheduledToday = habitsWithStats.filter((h) => isScheduledForDate(h, todayKey));
  const completedToday = scheduledToday.filter((h) => h.doneToday);
  const todayCompletionPercent = scheduledToday.length
    ? Math.round((completedToday.length / scheduledToday.length) * 100)
    : 0;

  const perfectDayStreak = computePerfectDayStreak(consistencyInputs);
  const consistency30 = computeConsistency30(consistencyInputs);
  const longestOverall = habitsWithStats.reduce((max, h) => Math.max(max, h.longestStreak), 0);
  const avgSuccessRate = habitsWithStats.length
    ? Math.round(habitsWithStats.reduce((sum, h) => sum + h.successRate, 0) / habitsWithStats.length)
    : 0;
  const habitScore = computeHabitScore({ todayCompletionPercent, consistency30, avgSuccessRate });

  const { weekdayPercent, weekendPercent } = computeWeekdayVsWeekend(consistencyInputs);
  const topStreakHabit = [...habitsWithStats].sort((a, b) => b.streak - a.streak)[0];
  const topStreakHabitTitle = topStreakHabit && topStreakHabit.streak > 0 ? topStreakHabit.title : null;

  const insights = generateInsights({
    topStreakHabitTitle,
    topStreak: topStreakHabit?.streak ?? 0,
    perfectDayStreak,
    consistency30,
    todayCompletionPercent,
    weekdayPercent,
    weekendPercent,
  });

  const categoryOptions: HabitCategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <HabitsHeader categories={categoryOptions} />

      <HabitStatsRow
        todayCompletionPercent={todayCompletionPercent}
        todayStreak={perfectDayStreak}
        longestStreak={longestOverall}
        habitScore={habitScore}
        consistency30={consistency30}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <TodayHabits habits={habitsWithStats} categories={categoryOptions} />
        <DailyMotivation
          topStreakHabitTitle={topStreakHabitTitle}
          topStreak={topStreakHabit?.streak ?? 0}
          perfectDayStreak={perfectDayStreak}
          insights={insights}
        />
      </div>

      <AchievementsStrip unlockedKeys={unlockedAchievements.map((a) => a.key as AchievementKey)} />
    </div>
  );
}
