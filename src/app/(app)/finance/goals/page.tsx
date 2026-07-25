import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalForm } from "@/components/finance/goal-form";
import { SavingsGoals } from "@/components/finance/savings-goals";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

export default async function GoalsPage() {
  const dbUser = await requireDbUser();
  const goals = await prisma.savingsGoal.findMany({
    where: { userId: dbUser.id, archived: false },
    orderBy: [{ isEmergencyFund: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Savings Goals</CardTitle>
            <CardDescription>Emergency fund and other targets.</CardDescription>
          </div>
          <GoalForm />
        </CardHeader>
        <CardContent>
          <SavingsGoals goals={goals} />
        </CardContent>
      </Card>
    </div>
  );
}
