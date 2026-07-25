import { ACHIEVEMENTS, type AchievementKey } from "@/lib/habits";

export function AchievementTimeline({ achievements }: { achievements: { key: string; unlockedAt: Date }[] }) {
  if (achievements.length === 0) {
    return <p className="text-sm text-muted-foreground">No achievements unlocked by this habit yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {achievements.map((a) => {
        const meta = ACHIEVEMENTS[a.key as AchievementKey];
        if (!meta) return null;
        return (
          <div key={a.key} className="flex items-center gap-3">
            <span className="text-xl">{meta.icon}</span>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{meta.title}</span>
              <span className="text-xs text-muted-foreground">
                {a.unlockedAt.toLocaleDateString("en-AU", {
                  timeZone: "Australia/Brisbane",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
