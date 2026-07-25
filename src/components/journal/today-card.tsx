import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Flame } from "lucide-react";
import { greeting } from "@/lib/greeting";
import { moodMeta } from "@/lib/journal";
import type { Mood } from "@/generated/prisma/client";

export function TodayCard({
  name,
  streak,
  entriesThisWeek,
  wordsToday,
  todayMood,
  todayEnergy,
  reflection,
}: {
  name: string;
  streak: number;
  entriesThisWeek: number;
  wordsToday: number;
  todayMood: Mood | null;
  todayEnergy: number | null;
  reflection: string | null;
}) {
  const mood = moodMeta(todayMood);

  const stats = [
    { label: "Journal Streak", value: `${streak} ${streak === 1 ? "Day" : "Days"}`, icon: Flame },
    { label: "Entries This Week", value: String(entriesThisWeek) },
    { label: "Words Today", value: String(wordsToday) },
    { label: "Mood", value: mood ? `${mood.emoji} ${mood.label}` : "Not logged" },
    { label: "Energy", value: todayEnergy != null ? `${todayEnergy}/10` : "Not logged" },
  ];

  return (
    <Card className="border-none bg-gradient-to-br from-card to-muted/40">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {greeting()}, {name}.
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border bg-background/60 p-3">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {"icon" in s && s.icon && <s.icon className="size-3" />}
                {s.label}
              </p>
              <p className="mt-0.5 text-sm font-medium">{s.value}</p>
            </div>
          ))}
        </div>
        {reflection && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">AI Reflection: </span>
              {reflection}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
