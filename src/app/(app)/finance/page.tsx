import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
import {
  computeNetWorth,
  computeLowBalanceAlerts,
  decToNumber,
  findSnapshotDaysAgo,
  formatCurrency,
  LOW_BALANCE_THRESHOLD,
  LOW_BALANCE_WINDOW_DAYS,
} from "@/lib/finance";
import { getAudFxSnapshot } from "@/lib/fx";
import {
  ensureTodaysNetWorthSnapshot,
  getOrGenerateCashflowNarrative,
  getOrGenerateSpendingInsights,
  getOrGenerateHealthScoreNarrative,
} from "@/lib/ai/finance";
import { processDueRecurringPayments } from "@/server/recurring-automation";

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

  // Must run before the net worth snapshot below - an autoPay bill that's
  // just come due needs to move the account balance first, or today's
  // snapshot (and everything cached from it) would be computed from a
  // stale balance.
  await processDueRecurringPayments(dbUser.id);
  await ensureTodaysNetWorthSnapshot(dbUser.id);

  const monthStart = startOfMonth(new Date());
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [accounts, investments, assetsLiabilities, recurring, snapshots, monthTxns, goals, cashflow, spendingInsights, healthScore, fx] =
    await Promise.all([
      prisma.financialAccount.findMany({ where: { userId: dbUser.id, archived: false } }),
      prisma.investment.findMany({ where: { userId: dbUser.id } }),
      prisma.assetLiability.findMany({ where: { userId: dbUser.id } }),
      prisma.recurringPayment.findMany({ where: { userId: dbUser.id, active: true, accountId: { not: null } } }),
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

  const lowBalanceAlerts = computeLowBalanceAlerts(
    accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, balance: decToNumber(a.balance), currency: a.currency })),
    recurring.map((r) => ({
      name: r.name,
      accountId: r.accountId,
      active: r.active,
      type: r.type,
      amount: decToNumber(r.amount),
      interval: r.interval,
      nextDueDate: r.nextDueDate,
    })),
  );

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

      {lowBalanceAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {lowBalanceAlerts.map((alert) => (
            <Alert key={alert.accountId} variant="destructive" className="border-destructive/40 bg-destructive/10">
              <TriangleAlert />
              <AlertTitle>
                {alert.alreadyLow
                  ? `Low balance: ${alert.accountName} is below ${formatCurrency(LOW_BALANCE_THRESHOLD, alert.currency)}`
                  : `Urgent: ${alert.accountName} is projected to drop below ${formatCurrency(LOW_BALANCE_THRESHOLD, alert.currency)}`}
              </AlertTitle>
              <AlertDescription>
                Currently {formatCurrency(alert.currentBalance, alert.currency)}
                {alert.upcoming.length > 0 && (
                  <>
                    , projected to {formatCurrency(alert.projectedBalance, alert.currency)} within the next {LOW_BALANCE_WINDOW_DAYS} days from{" "}
                    {alert.upcoming.map((u, i) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        {u.name} ({u.type === "EXPENSE" ? "-" : "+"}
                        {formatCurrency(u.amount, alert.currency)} on {u.date.toLocaleDateString("en-AU", { month: "short", day: "numeric" })})
                      </span>
                    ))}
                  </>
                )}
                .
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

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
