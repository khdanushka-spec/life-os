import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { averageMoodScore, moodForScore, longestStreak, wordCount, humanizeSeconds } from "@/lib/journal";
import { computeStreak } from "@/lib/habits";
import { brisbaneDateKey } from "@/lib/date";

export async function JournalStats({ userId }: { userId: string }) {
  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    select: { createdAt: true, mood: true, contentText: true, tags: true, writingSeconds: true },
  });

  if (entries.length === 0) return null;

  const dateKeys = new Set(entries.map((e) => brisbaneDateKey(e.createdAt)));
  const current = computeStreak(dateKeys);
  const longest = longestStreak(dateKeys);
  const avgMoodScore = averageMoodScore(entries.map((e) => e.mood));
  const totalWords = entries.reduce((sum, e) => sum + wordCount(e.contentText), 0);
  const avgWords = Math.round(totalWords / entries.length);
  const totalSeconds = entries.reduce((sum, e) => sum + (e.writingSeconds ?? 0), 0);

  const tagCounts = new Map<string, number>();
  for (const e of entries) {
    for (const tag of e.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const stats = [
    { label: "Entries", value: String(entries.length) },
    { label: "Current Streak", value: `${current} ${current === 1 ? "day" : "days"}` },
    { label: "Longest Streak", value: `${longest} ${longest === 1 ? "day" : "days"}` },
    { label: "Average Mood", value: avgMoodScore != null ? `${moodForScore(avgMoodScore).emoji} ${moodForScore(avgMoodScore).label}` : "—" },
    { label: "Average Words", value: String(avgWords) },
    { label: "Writing Time", value: totalSeconds > 0 ? humanizeSeconds(totalSeconds) : "—" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-primary" /> Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border p-2">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className="text-sm font-medium">{s.value}</p>
            </div>
          ))}
        </div>
        {topTags.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">Most Used Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(([tag, count]) => (
                <span key={tag} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {tag} · {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
