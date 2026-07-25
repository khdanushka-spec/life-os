"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, RefreshCw, Loader2 } from "lucide-react";
import { regenerateInsightsAction } from "@/server/actions/journal";

export function AiInsights({ initialInsights }: { initialInsights: string[] | null }) {
  const [insights, setInsights] = useState(initialInsights);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const next = await regenerateInsightsAction();
    setInsights(next);
    setLoading(false);
  }

  if (!insights && !loading) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="size-4 text-primary" /> AI Insights
        </CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={refresh} disabled={loading} aria-label="Refresh insights">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {insights?.map((insight, i) => (
          <p key={i} className="rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
            {insight}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
