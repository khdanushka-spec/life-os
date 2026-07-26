import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkInsightCard({ insight }: { insight: string | null }) {
  if (!insight) return null;
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" /> AI Daily Insight
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{insight}</p>
      </CardContent>
    </Card>
  );
}
