"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ScrollText } from "lucide-react";
import { generateReportAction } from "@/server/actions/journal";
import type { JournalReportSummary } from "@/lib/journal";
import type { ReportPeriod } from "@/generated/prisma/client";

const SECTIONS: { key: keyof JournalReportSummary; label: string }[] = [
  { key: "wins", label: "Wins" },
  { key: "challenges", label: "Challenges" },
  { key: "lessons", label: "Lessons Learned" },
  { key: "suggestions", label: "Suggestions" },
];

export function WeeklyReport({
  period,
  periodStart,
  initialReport,
}: {
  period: ReportPeriod;
  periodStart: string;
  initialReport: JournalReportSummary | null;
}) {
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);
  const title = period === "WEEK" ? "Weekly Reflection" : "Monthly Life Report";

  async function generate() {
    setLoading(true);
    const result = await generateReportAction(period, periodStart);
    if (result) setReport(result);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="size-4 text-primary" /> {title}
        </CardTitle>
        <Button variant="outline" size="xs" onClick={generate} disabled={loading}>
          {loading && <Loader2 className="size-3 animate-spin" />}
          {report ? "Regenerate" : "Generate"}
        </Button>
      </CardHeader>
      {report && (
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Mood: </span>
            {report.moodTrend}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Energy: </span>
            {report.energyTrend}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Habits: </span>
            {report.habitsNote}
          </p>
          {SECTIONS.map(({ key, label }) => {
            const items = report[key] as string[];
            if (!items?.length) return null;
            return (
              <div key={key}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
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
