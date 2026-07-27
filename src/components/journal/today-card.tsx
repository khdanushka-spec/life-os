"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Flame, CalendarDays, PenLine, Smile, Zap } from "lucide-react";
import { greeting } from "@/lib/greeting";
import { moodMeta } from "@/lib/journal";
import { StatCard } from "@/components/stat-card";
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

  return (
    <Card className="border-none bg-gradient-to-br from-card to-muted/40">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {greeting()}, {name}.
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            icon={Flame}
            label="Journal Streak"
            value={streak}
            suffix={streak === 1 ? " Day" : " Days"}
            accent="bg-orange-500"
          />
          <StatCard icon={CalendarDays} label="Entries This Week" value={entriesThisWeek} accent="bg-sky-500" />
          <StatCard icon={PenLine} label="Words Today" value={wordsToday} accent="bg-primary" />
          <StatCard
            icon={Smile}
            label="Mood"
            value={mood ? `${mood.emoji} ${mood.label}` : "Not logged"}
            accent="bg-amber-500"
          />
          <StatCard
            icon={Zap}
            label="Energy"
            value={todayEnergy != null ? `${todayEnergy}/10` : "Not logged"}
            accent="bg-emerald-500"
          />
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
