import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brisbaneDateKey } from "@/lib/date";
import { computeLearningScore } from "@/lib/learning";
import { getOrGenerateDailyInsight } from "@/lib/ai/learning";
import { LearningStatsRow } from "@/components/learning/learning-stats-row";
import { DailyStudyLogCard } from "@/components/learning/daily-study-log-card";
import { StudyMinutesChart } from "@/components/learning/study-minutes-chart";
import { RecentCourses } from "@/components/learning/recent-courses";
import { UpcomingCertificateExpiries } from "@/components/learning/upcoming-certificate-expiries";
import { LearningInsightCard } from "@/components/learning/learning-insight-card";

const SUB_PAGES = [
  { href: "/learning/courses", label: "Courses" },
  { href: "/learning/books", label: "Books" },
  { href: "/learning/certificates", label: "Certificates" },
  { href: "/learning/reports", label: "Reports" },
];

export default async function LearningPage() {
  const dbUser = await requireDbUser();

  const todayKey = brisbaneDateKey();
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const sixtyDaysAhead = new Date(now.getTime() + 60 * 86_400_000);

  const [todayLog, recentLogs, studyLogs30d, inProgressCourses, readingBooks, upcomingExpiries, dailyInsight] =
    await Promise.all([
      prisma.studyLog.findUnique({ where: { userId_date: { userId: dbUser.id, date: today } } }),
      prisma.studyLog.findMany({ where: { userId: dbUser.id, date: { gte: weekAgo } }, orderBy: { date: "desc" } }),
      prisma.studyLog.findMany({
        where: { userId: dbUser.id, date: { gte: thirtyDaysAgo } },
        orderBy: { date: "asc" },
      }),
      prisma.course.findMany({ where: { userId: dbUser.id, status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" } }),
      prisma.book.findMany({ where: { userId: dbUser.id, status: "READING" } }),
      prisma.certificate.findMany({
        where: { userId: dbUser.id, expiryDate: { gte: now, lt: sixtyDaysAhead } },
        orderBy: { expiryDate: "asc" },
      }),
      getOrGenerateDailyInsight(dbUser.id),
    ]);

  const studyDaysThisWeek = recentLogs.filter((l) => l.minutesStudied != null && l.minutesStudied > 0).length;
  const avgCourseProgress = inProgressCourses.length
    ? inProgressCourses.reduce((sum, c) => sum + c.progressPercent, 0) / inProgressCourses.length
    : null;

  const learningScore = computeLearningScore({
    minutesStudiedToday: todayLog?.minutesStudied ?? null,
    avgCourseProgress,
    hasActiveBook: readingBooks.length > 0,
    studyDaysThisWeek,
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning</h1>
        <p className="text-sm text-muted-foreground">Courses, books, and certificates — one daily check-in.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUB_PAGES.map((p) => (
          <Link key={p.href} href={p.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {p.label}
          </Link>
        ))}
      </div>

      <LearningStatsRow
        learningScore={learningScore}
        minutesStudiedToday={todayLog?.minutesStudied ?? 0}
        coursesInProgress={inProgressCourses.length}
        booksReading={readingBooks.length}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <DailyStudyLogCard
            log={{
              date: todayKey,
              minutesStudied: todayLog?.minutesStudied ?? null,
              focusScore: todayLog?.focusScore ?? null,
              note: todayLog?.note ?? null,
            }}
          />
          <Card className="border-none bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base">Study Minutes (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <StudyMinutesChart
                entries={studyLogs30d.map((l) => ({ date: l.date.toISOString().slice(0, 10), minutes: l.minutesStudied ?? 0 }))}
              />
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <LearningInsightCard insight={dailyInsight} />
          <RecentCourses courses={inProgressCourses.map((c) => ({ id: c.id, title: c.title, progressPercent: c.progressPercent }))} />
          <UpcomingCertificateExpiries
            certificates={upcomingExpiries
              .filter((c) => c.expiryDate)
              .map((c) => ({ id: c.id, title: c.title, expiryDate: c.expiryDate! }))}
          />
        </div>
      </div>
    </div>
  );
}
