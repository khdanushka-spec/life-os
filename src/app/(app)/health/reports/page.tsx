import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HealthReportCard } from "@/components/health/health-report-card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { startOfWeek, startOfMonth, startOfYear, brisbaneToday } from "@/lib/date";
import type { HealthReportSummary } from "@/lib/health";
import type { ReportPeriod } from "@/generated/prisma/client";

export default async function HealthReportsPage() {
  const dbUser = await requireDbUser();
  const now = new Date();

  const periods: { period: ReportPeriod; periodStart: Date }[] = [
    { period: "DAY", periodStart: brisbaneToday(now) },
    { period: "WEEK", periodStart: startOfWeek(now) },
    { period: "MONTH", periodStart: startOfMonth(now) },
    { period: "YEAR", periodStart: startOfYear(now) },
  ];

  const reports = await Promise.all(
    periods.map(({ period, periodStart }) =>
      prisma.healthReport.findUnique({
        where: { userId_period_periodStart: { userId: dbUser.id, period, periodStart } },
      }),
    ),
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/health" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Health
      </Link>
      <Tabs defaultValue="MONTH">
        <TabsList>
          <TabsTrigger value="DAY">Day</TabsTrigger>
          <TabsTrigger value="WEEK">Week</TabsTrigger>
          <TabsTrigger value="MONTH">Month</TabsTrigger>
          <TabsTrigger value="YEAR">Year</TabsTrigger>
        </TabsList>
        {periods.map(({ period, periodStart }, i) => (
          <TabsContent key={period} value={period}>
            <HealthReportCard
              period={period}
              periodStart={periodStart.toISOString()}
              initialReport={(reports[i]?.summary as HealthReportSummary | undefined) ?? null}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
