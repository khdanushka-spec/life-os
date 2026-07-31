import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { FinanceHeader } from "@/components/finance/finance-header";
import { NetWorthChart } from "@/components/finance/net-worth-chart";
import { SpendingAnalytics } from "@/components/finance/spending-analytics";
import { FinancialCalendar } from "@/components/finance/financial-calendar";
import { FinancialHealthScore } from "@/components/finance/financial-health-score";
import { AiFinancialInsights } from "@/components/finance/ai-financial-insights";
import { SavingsGoals } from "@/components/finance/savings-goals";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { startOfMonth } from "@/lib/date";
import { computeNetWorth, decToNumber, findSnapshotDaysAgo } from "@/lib/finance";
import { getAudFxSnapshot } from "@/lib/fx";
import {
  ensureTodaysNetWorthSnapshot,
  getOrGenerateCashflowNarrative,
  getOrGenerateSpendingInsights,
  getOrGenerateHealthScoreNarrative,
} from "@/lib/ai/finance";

const SUB_PAGES = [
  { href: "/finance/accounts", label: "Accounts" },
  { href: "/finance/transactions", label: "Transactions" },
  { href: "/finance/budgets", label: "Budgets" },
  { href: "/finance/recurring", label: "Bills & Subscriptions" },
  { href: "/finance/goals", label: "Savings Goals" },
  { href: "/finance/investments", label: "Investments & Assets" },
  { href: "/finance/foreign", label: "Foreign Accounts" },
  { href: "/finance/reports", label: "Reports" },
];

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const dbUser = await requireDbUser();

  await ensureTodaysNetWorthSnapshot(dbUser.id);

  const monthStart = startOfMonth(new Date());
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [accounts, investments, assetsLiabilities, snapshots, monthTxns, goals, cashflow, spendingInsights, healthScore, fx] =
    await Promise.all([
      prisma.financialAccount.findMany({ where: { userId: dbUser.id, archived: false } }),
      prisma.investment.findMany({ where: { userId: dbUser.id } }),
      prisma.assetLiability.findMany({ where: { userId: dbUser.id } }),
      prisma.netWorthSnapshot.findMany({ where: { userId: dbUser.id, date: { gte: since } }, orderBy: { date: "asc" } }),
      prisma.transaction.findMany({ where: { userId: dbUser.id, type: "EXPENSE", date: { gte: monthStart } } }),
      prisma.savingsGoal.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: [{ isEmergencyFund: "desc" }, { createdAt: "asc" }] }),
      getOrGenerateCashflowNarrative(dbUser.id),
      getOrGenerateSpendingInsights(dbUser.id),
      getOrGenerateHealthScoreNarrative(dbUser.id),
      getAudFxSnapshot(),
    ]);

  const { netWorth } = computeNetWorth({
    accounts: accounts.map((a) => ({ type: a.type, balance: decToNumber(a.balance), currency: a.currency })),
    investments: investments.map((i) => ({ currentValue: decToNumber(i.currentValue), currency: i.currency })),
    assetsLiabilities: assetsLiabilities.map((a) => ({ kind: a.kind, value: decToNumber(a.value) })),
    fxRatesToAud: fx?.rates,
  });

  const monthAgoSnapshot = findSnapshotDaysAgo(snapshots, 30);
  const netWorthChange = monthAgoSnapshot ? netWorth - decToNumber(monthAgoSnapshot.netWorth) : null;

  const spendByCategory: Record<string, number> = {};
  for (const t of monthTxns) {
    spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + decToNumber(t.amount);
  }

  const name = dbUser.username ?? dbUser.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <FinanceHeader name={name} netWorth={netWorth} netWorthChange={netWorthChange} />

      <div className="flex flex-wrap gap-2">
        {SUB_PAGES.map((p) => (
          <Link key={p.href} href={p.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Net Worth</CardTitle>
              <CardDescription>Last 90 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <NetWorthChart points={snapshots.map((s) => ({ date: s.date.toISOString(), netWorth: decToNumber(s.netWorth) }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spending this month</CardTitle>
              <CardDescription>By category.</CardDescription>
            </CardHeader>
            <CardContent>
              <SpendingAnalytics data={Object.entries(spendByCategory).map(([category, amount]) => ({ category, amount }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Savings Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <SavingsGoals
                goals={goals.map((g) => ({
                  ...g,
                  targetAmount: decToNumber(g.targetAmount),
                  currentAmount: decToNumber(g.currentAmount),
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <FinancialHealthScore initial={healthScore} />
          <AiFinancialInsights initialCashflow={cashflow} initialInsights={spendingInsights} />
          <FinancialCalendar userId={dbUser.id} monthParam={month} />
        </div>
      </div>
    </div>
  );
}
