import { z } from "zod";
import type { CourseStatus, BookStatus } from "@/generated/prisma/client";

export const COURSE_STATUS_META: Record<CourseStatus, { label: string; icon: string }> = {
  NOT_STARTED: { label: "Not Started", icon: "⏳" },
  IN_PROGRESS: { label: "In Progress", icon: "📘" },
  COMPLETED: { label: "Completed", icon: "✅" },
  PAUSED: { label: "Paused", icon: "⏸️" },
};

export const BOOK_STATUS_META: Record<BookStatus, { label: string; icon: string }> = {
  WANT_TO_READ: { label: "Want to Read", icon: "📚" },
  READING: { label: "Reading", icon: "📖" },
  FINISHED: { label: "Finished", icon: "✅" },
  ABANDONED: { label: "Abandoned", icon: "🚫" },
};

const STUDY_GOAL_MINUTES = 30;
const STUDY_DAYS_GOAL_PER_WEEK = 5;

// Deterministic, documented weighted formula - never AI-guessed, same
// "AI narrates, math computes" principle as the rest of the app. A
// metric that wasn't logged/has nothing active defaults to a neutral 50
// rather than 0, so an unlogged field doesn't tank the score the way a
// genuinely bad value would.
export function computeLearningScore(input: {
  minutesStudiedToday: number | null;
  avgCourseProgress: number | null;
  hasActiveBook: boolean;
  studyDaysThisWeek: number;
}): number {
  const studyScore = input.minutesStudiedToday != null ? Math.min(100, (input.minutesStudiedToday / STUDY_GOAL_MINUTES) * 100) : 50;
  const courseScore = input.avgCourseProgress != null ? input.avgCourseProgress : 50;
  const readingScore = input.hasActiveBook ? 100 : 50;
  const consistencyScore = Math.min(100, (input.studyDaysThisWeek / STUDY_DAYS_GOAL_PER_WEEK) * 100);

  return Math.round(studyScore * 0.3 + courseScore * 0.3 + readingScore * 0.2 + consistencyScore * 0.2);
}

export { STUDY_GOAL_MINUTES, STUDY_DAYS_GOAL_PER_WEEK };

// The AI only ever fills in these narrative fields - every number in a
// report is computed separately and merged in, same principle as
// Work's/Health's reports.
export const learningReportNarrativeSchema = z.object({
  overview: z.string(),
  wins: z.array(z.string()).max(5),
  challenges: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
});
export type LearningReportNarrative = z.infer<typeof learningReportNarrativeSchema>;

export type LearningReportSummary = LearningReportNarrative & {
  totalMinutesStudied: number;
  coursesCompleted: number;
  booksFinished: number;
  avgFocusScore: number | null;
};
