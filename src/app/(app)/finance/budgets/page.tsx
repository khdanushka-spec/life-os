import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetForm } from "@/components/finance/budget-form";
import { BudgetPlanner, type BudgetRow } from "@/components/finance/budget-planner";
import { BudgetYearlyChart, type MonthlyTotals } from "@/components/finance/budget-yearly-chart";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { startOfMonth, startOfYear } from "@/lib/date";
import { decToNumber } from "@/lib/finance";

export default async function BudgetsPage() {
  const dbUser = await requireDbUser();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
  const yearStart = startOfYear(now);

  const [budgets, monthTxns, yearBudgets, yearTxns] = await Promise.all([
    prisma.budget.findMany({ where: { userId: dbUser.id, month: monthStart } }),
    prisma.transaction.findMany({
      where: { userId: dbUser.id, type: "EXPENSE", date: { gte: monthStart, lt: nextMonthStart } },
    }),
    prisma.budget.findMany({ where: { userId: dbUser.id, month: { gte: yearStart } } }),
    prisma.transaction.findMany({
      where: { userId: dbUser.id, type: "EXPENSE", date: { gte: yearStart } },
    }),
  ]);

  const spendByCategory: Record<string, number> = {};
  for (const t of monthTxns) {
    spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + decToNumber(t.amount);
  }
  const rows: BudgetRow[] = budgets.map((b) => ({
    id: b.id,
    category: b.category,
    limit: decToNumber(b.monthlyLimit),
    spent: spendByCategory[b.category] ?? 0,
  }));

  const monthLabels = Array.from({ length: 12 }, (_, i) =>
    new Date(now.getFullYear(), i, 1).toLocaleDateString(undefined, { month: "short" }),
  );
  const budgetedByMonth = new Array(12).fill(0);
  for (const b of yearBudgets) {
    budgetedByMonth[b.month.getMonth()] += decToNumber(b.monthlyLimit);
  }
  const actualByMonth = new Array(12).fill(0);
  for (const t of yearTxns) {
    actualByMonth[new Date(t.date).getMonth()] += decToNumber(t.amount);
  }
  const yearlyData: MonthlyTotals[] = monthLabels.map((month, i) => ({
    month,
    budgeted: budgetedByMonth[i],
    actual: actualByMonth[i],
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>
              Budgets — {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </CardTitle>
            <CardDescription>This month&apos;s spending against your limits.</CardDescription>
          </div>
          <BudgetForm month={monthStart.toISOString()} />
        </CardHeader>
        <CardContent>
          <BudgetPlanner rows={rows} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Yearly comparison</CardTitle>
          <CardDescription>Budgeted vs actual spending, {now.getFullYear()}.</CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetYearlyChart data={yearlyData} />
        </CardContent>
      </Card>
    </div>
  );
}
