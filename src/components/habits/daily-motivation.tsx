import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Sparkles, Quote } from "lucide-react";

const QUOTES = [
  "Small actions, repeated daily, become extraordinary results.",
  "You don't rise to the level of your goals, you fall to the level of your systems.",
  "Discipline is choosing between what you want now and what you want most.",
  "Every habit is a vote for the person you're becoming.",
  "Consistency beats intensity.",
];

function quoteForToday(): string {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return QUOTES[dayIndex % QUOTES.length];
}

export function DailyMotivation({
  topStreakHabitTitle,
  topStreak,
  perfectDayStreak,
  insights,
}: {
  topStreakHabitTitle: string | null;
  topStreak: number;
  perfectDayStreak: number;
  insights: string[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-none bg-gradient-to-br from-primary/10 to-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Daily Motivation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {topStreakHabitTitle && topStreak > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-background/50 p-3 text-sm">
              <Flame className="mt-0.5 size-4 shrink-0 text-orange-500" />
              <p>
                <span className="font-medium">{topStreakHabitTitle}</span> is on a {topStreak}-day
                streak{perfectDayStreak >= topStreak ? " and counting" : ""}.
              </p>
            </div>
          )}
          <div className="flex items-start gap-2 rounded-xl bg-background/50 p-3 text-sm text-muted-foreground">
            <Quote className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="italic">{quoteForToday()}</p>
          </div>
        </CardContent>
      </Card>

      {insights.length > 0 && (
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {insights.map((insight) => (
              <div key={insight} className="flex items-start gap-2 text-sm">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p className="text-muted-foreground">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
