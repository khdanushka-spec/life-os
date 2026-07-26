import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { WorkoutsHeader } from "@/components/health/workouts-header";
import { WorkoutRow } from "@/components/health/workout-row";

export default async function WorkoutsPage() {
  const dbUser = await requireDbUser();

  const workouts = await prisma.workout.findMany({
    where: { userId: dbUser.id },
    orderBy: { performedAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/health" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Health
      </Link>
      <WorkoutsHeader />

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">All Workouts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {workouts.length === 0 && <p className="text-sm text-muted-foreground">No workouts logged yet.</p>}
          {workouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
