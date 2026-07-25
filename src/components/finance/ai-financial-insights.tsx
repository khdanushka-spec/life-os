"use client";

import { useState, useTransition } from "react";
import { Lightbulb, RefreshCw, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { regenerateCashflowNarrativeAction, regenerateSpendingInsightsAction } from "@/server/actions/finance";
import { formatCurrency } from "@/lib/finance";
import type { CashFlowProjection, SpendingAnomaly } from "@/lib/finance";

export function AiFinancialInsights({
  initialCashflow,
  initialInsights,
}: {
  initialCashflow: { narrative: string | null; projection: CashFlowProjection } | null;
  initialInsights: { narrative: string | null; anomalies: SpendingAnomaly[] } | null;
}) {
  const [cashflow, setCashflow] = useState(initialCashflow);
  const [insights, setInsights] = useState(initialInsights);
  const [isPending, startTransition] = useTransition();

  if (!cashflow && !insights) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="size-4 text-primary" /> AI Financial Insights
        </CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const [cf, ins] = await Promise.all([
                regenerateCashflowNarrativeAction(),
                regenerateSpendingInsightsAction(),
              ]);
              setCashflow(cf);
              setInsights(ins);
            })
          }
        >
          <RefreshCw className={isPending ? "size-3.5 animate-spin" : "size-3.5"} />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {cashflow && (
          <div className="rounded-lg border border-dashed p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <TrendingUp className="size-3.5" /> 30-day cash flow
            </p>
            {cashflow.narrative && <p className="mt-1 text-xs text-muted-foreground">{cashflow.narrative}</p>}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Projected balance: {formatCurrency(cashflow.projection.projectedBalance)}
            </p>
          </div>
        )}
        {insights?.narrative && (
          <p className="rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">{insights.narrative}</p>
        )}
      </CardContent>
    </Card>
  );
}
