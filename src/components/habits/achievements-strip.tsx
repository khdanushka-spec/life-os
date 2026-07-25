import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACHIEVEMENT_KEYS, ACHIEVEMENTS, type AchievementKey } from "@/lib/habits";
import { cn } from "@/lib/utils";

export function AchievementsStrip({ unlockedKeys }: { unlockedKeys: AchievementKey[] }) {
  const unlocked = new Set(unlockedKeys);

  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-base">Achievements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {ACHIEVEMENT_KEYS.map((key) => {
            const achievement = ACHIEVEMENTS[key];
            const isUnlocked = unlocked.has(key);
            return (
              <div
                key={key}
                title={achievement.description}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-opacity",
                  isUnlocked ? "border-primary/30 bg-primary/5" : "opacity-40 grayscale",
                )}
              >
                <span className="text-2xl">{achievement.icon}</span>
                <span className="text-[11px] font-medium leading-tight">{achievement.title}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
