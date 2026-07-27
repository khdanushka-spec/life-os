"use client";

import { GraduationCap, Clock, BookOpen, Library } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export function LearningStatsRow({
  learningScore,
  minutesStudiedToday,
  coursesInProgress,
  booksReading,
}: {
  learningScore: number;
  minutesStudiedToday: number;
  coursesInProgress: number;
  booksReading: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={GraduationCap} label="Learning Score" value={learningScore} suffix="%" accent="bg-violet-500" />
      <StatCard icon={Clock} label="Minutes Today" value={minutesStudiedToday} suffix="m" accent="bg-amber-500" />
      <StatCard icon={BookOpen} label="Courses In Progress" value={coursesInProgress} accent="bg-sky-500" />
      <StatCard icon={Library} label="Books Reading" value={booksReading} accent="bg-emerald-500" />
    </div>
  );
}
