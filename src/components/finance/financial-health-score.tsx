"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/circular-progress";
import { regenerateHealthScoreNarrativeAction } from "@/server/actions/finance";
import type { HealthScoreBreakdown } from "@/lib/finance";

const SUB_SCORES: { key: keyof Pick<HealthScoreBreakdown, "savingsRate" | "emergencyFund" | "debtToIncome" | "budgetAdherence">; label: string }[] = [
  { key: "savingsRate", label: "Savings rate" },
  { key: "emergencyFund", label: "Emergency fund" },
  { key: "debtToIncome", label: "Debt-to-income" },
  { key: "budgetAdherence", label: "Budget adherence" },
];

export function FinancialHealthScore({
  initial,
}: {
  initial: { breakdown: HealthScoreBreakdown; narrative: string | null } | null;
}) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Add an account and a few transactions to see your score.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>A deterministic score - AI only explains it, never invents it.</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await regenerateHealthScoreNarrativeAction();
              if (result) setData(result);
            })
          }
        >
          <RefreshCw className={isPending ? "size-3.5 animate-spin" : "size-3.5"} />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <CircularProgress value={data.breakdown.score} label="Score" />
          <div className="grid flex-1 grid-cols-2 gap-2">
            {SUB_SCORES.map((s) => (
              <div key={s.key} className="rounded-lg border p-2">
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className="text-sm font-semibold tabular-nums">{data.breakdown[s.key].score}</p>
              </div>
            ))}
          </div>
        </div>
        {data.narrative && <p className="text-sm text-muted-foreground">{data.narrative}</p>}
      </CardContent>
    </Card>
  );
}
