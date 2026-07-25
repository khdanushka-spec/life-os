import { LiveClock } from "@/components/live-clock";
import { moodMeta } from "@/lib/journal";
import { brisbaneToday } from "@/lib/date";
import type { Weather } from "@/lib/weather";
import type { Mood } from "@/generated/prisma/client";

// Both computed off Brisbane's calendar day, not the server's UTC clock -
// see lib/date.ts for why a plain date.getFullYear()/getDate() is wrong here.
function dayOfYear(date: Date): number {
  const key = brisbaneToday(date);
  const start = new Date(Date.UTC(key.getUTCFullYear(), 0, 0));
  return Math.floor((key.getTime() - start.getTime()) / 86_400_000);
}

export function JournalHeader({
  weather,
  todayMood,
}: {
  weather: Weather | null;
  todayMood: Mood | null;
}) {
  const now = new Date();
  const mood = moodMeta(todayMood);

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card/60 p-6 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
      />
      <div className="relative flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span aria-hidden>📖</span> Journal
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            {now.toLocaleDateString("en-AU", {
              timeZone: "Australia/Brisbane",
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span>·</span>
          <LiveClock />
          <span>·</span>
          <span>Day {dayOfYear(now)} of the year</span>
          {weather && (
            <>
              <span>·</span>
              <span>
                {weather.icon} {weather.location} {weather.tempC}°C, {weather.condition}
              </span>
            </>
          )}
          {mood && (
            <>
              <span>·</span>
              <span>
                {mood.emoji} Feeling {mood.label}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
