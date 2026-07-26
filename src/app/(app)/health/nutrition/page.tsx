import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { NutritionHeader } from "@/components/health/nutrition-header";
import { NutritionRow } from "@/components/health/nutrition-row";

export default async function NutritionPage() {
  const dbUser = await requireDbUser();

  const entries = await prisma.nutritionEntry.findMany({
    where: { userId: dbUser.id },
    orderBy: { loggedAt: "desc" },
  });

  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.loggedAt.toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "long", day: "numeric", month: "long" });
    const existing = groups.get(key);
    if (existing) existing.push(entry);
    else groups.set(key, [entry]);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/health" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Health
      </Link>
      <NutritionHeader />

      {entries.length === 0 && (
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No meals logged yet.</p>
          </CardContent>
        </Card>
      )}

      {[...groups.entries()].map(([date, dayEntries]) => (
        <Card key={date} className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">{date}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {dayEntries.map((e) => (
              <NutritionRow key={e.id} entry={e} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
