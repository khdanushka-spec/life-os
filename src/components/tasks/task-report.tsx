"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ScrollText } from "lucide-react";
import { generateTaskReportAction } from "@/server/actions/tasks";
import type { TaskReportSummary } from "@/lib/tasks";
import type { ReportPeriod } from "@/generated/prisma/client";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  DAY: "Daily Review",
  WEEK: "Weekly Review",
  MONTH: "Monthly Review",
  YEAR: "Yearly Review",
};

export function TaskReportCard({
  period,
  periodStart,
  initialReport,
}: {
  period: ReportPeriod;
  periodStart: string;
  initialReport: TaskReportSummary | null;
}) {
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const result = await generateTaskReportAction(period, periodStart);
    if (result) setReport(result);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="size-4 text-primary" /> {PERIOD_LABELS[period]}
        </CardTitle>
        <Button variant="outline" size="xs" onClick={generate} disabled={loading}>
          {loading && <Loader2 className="size-3 animate-spin" />}
          {report ? "Regenerate" : "Generate"}
        </Button>
      </CardHeader>
      {report && (
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border p-2">
              <p className="text-[11px] text-muted-foreground">Created</p>
              <p className="font-semibold tabular-nums">{report.totalCreated}</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-[11px] text-muted-foreground">Completed</p>
              <p className="font-semibold tabular-nums">{report.totalCompleted}</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-[11px] text-muted-foreground">Rate</p>
              <p className="font-semibold tabular-nums">{Math.round(report.completionRate * 100)}%</p>
            </div>
          </div>
          <p className="text-muted-foreground">{report.overview}</p>
          {(["wins", "challenges", "suggestions"] as const).map((key) => {
            const items = report[key];
            if (!items?.length) return null;
            return (
              <div key={key}>
                <p className="mb-1 text-xs font-medium text-muted-foreground capitalize">{key}</p>
                <ul className="flex flex-col gap-1">
                  {items.map((item, i) => (
                    <li key={i} className="rounded-lg border border-dashed p-2 text-xs">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
