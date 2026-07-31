import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { resolveAiModel } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import {
  decToNumber,
  computeNetWorth,
  computeHealthScore,
  projectCashFlow,
  detectUnusualSpending,
  formatCurrency,
  financialReportNarrativeSchema,
  findSnapshotDaysAgo,
  type FinancialReportSummary,
} from "@/lib/finance";
import { startOfMonth, brisbaneToday } from "@/lib/date";
import { getAudFxSnapshot, convertToAud } from "@/lib/fx";
import type { ReportPeriod } from "@/generated/prisma/client";

const SYSTEM =
  "You are the financial voice inside AURA OS - grounded, precise, never alarmist. " +
  "You are ALWAYS given real computed numbers; only explain and contextualize them in plain language. " +
  "Never state a number that wasn't given to you, and never invent a trend the data doesn't support.";

const todayDate = brisbaneToday;

async function readCache(userId: string, kind: string): Promise<unknown | null> {
  const cached = await prisma.financialAiCache.findUnique({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
  });
  return cached?.content ?? null;
}

async function writeCache(userId: string, kind: string, content: unknown) {
  await prisma.financialAiCache.upsert({
    where: { userId_date_kind: { userId, date: todayDate(), kind } },
    update: { content: content as object },
    create: { userId, date: todayDate(), kind, content: content as object },
  });
}

async function loadNetWorthInputs(userId: string) {
  const [accounts, investments, assetsLiabilities, fx] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId, archived: false } }),
    prisma.investment.findMany({ where: { userId } }),
    prisma.assetLiability.findMany({ where: { userId } }),
    getAudFxSnapshot(),
  ]);
  return {
    accounts: accounts.map((a) => ({ type: a.type, balance: decToNumber(a.balance), currency: a.currency })),
    investments: investments.map((i) => ({ currentValue: decToNumber(i.currentValue), currency: i.currency })),
    assetsLiabilities: assetsLiabilities.map((a) => ({ kind: a.kind, value: decToNumber(a.value) })),
    fxRatesToAud: fx?.rates,
  };
}

async function trailingMonthlyAverages(userId: string, months = 3) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const txns = await prisma.transaction.findMany({
    where: { userId, date: { gte: since }, type: { in: ["INCOME", "EXPENSE"] } },
  });
  let income = 0;
  let expenses = 0;
  for (const t of txns) {
    const amt = decToNumber(t.amount);
    if (t.type === "INCOME") income += amt;
    else expenses += amt;
  }
  return { avgMonthlyIncome: income / months, avgMonthlyExpenses: expenses / months };
}

export async function getOrGenerateCashflowNarrative(userId: string): Promise<{
  narrative: string | null;
  projection: ReturnType<typeof projectCashFlow>;
} | null> {
  const cached = (await readCache(userId, "cashflow")) as
    | { narrative: string; projection: ReturnType<typeof projectCashFlow> }
    | null;
  if (cached) return cached;

  const [accounts, recurring, fx] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId, archived: false } }),
    prisma.recurringPayment.findMany({ where: { userId, active: true } }),
    getAudFxSnapshot(),
  ]);
  // Foreign-currency liquid accounts must be converted before summing with
  // AUD ones - a raw LKR balance added directly to an AUD checking balance
  // would inflate this by orders of magnitude. An account whose currency
  // can't be converted right now (rate unavailable) is excluded rather
  // than counted at face value, same rule as computeNetWorth.
  const liquidBalance = accounts
    .filter((a) => a.type === "CHECKING" || a.type === "SAVINGS" || a.type === "CASH")
    .reduce((sum, a) => {
      const converted = convertToAud(decToNumber(a.balance), a.currency, fx?.rates);
      return converted == null ? sum : sum + converted;
    }, 0);

  const projection = projectCashFlow(
    30,
    liquidBalance,
    recurring.map((r) => ({
      type: r.type,
      amount: decToNumber(r.amount),
      interval: r.interval,
      nextDueDate: r.nextDueDate,
    })),
  );

  const resolved = await resolveAiModel();
  if (!resolved) return { narrative: null, projection };

  // Runs unconditionally on every /finance page load - if the AI call fails,
  // still return the already-computed projection rather than losing it
  // ("AI narrates, math computes": the math stands on its own).
  let narrative: string | null = null;
  try {
    ({ text: narrative } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `Here is a 30-day cash flow projection, already computed from known recurring income/bills:\nStarting liquid balance: ${formatCurrency(projection.startingBalance)}\nExpected income: ${formatCurrency(projection.incomeTotal)}\nExpected bills/expenses: ${formatCurrency(projection.expenseTotal)}\nProjected balance in 30 days: ${formatCurrency(projection.projectedBalance)}\n\nWrite one grounded, 1-2 sentence take on this projection. Do not restate every number - just the takeaway.`,
    }));
  } catch {
    narrative = null;
  }

  const result = { narrative, projection };
  await writeCache(userId, "cashflow", result);
  return result;
}

export async function getOrGenerateSpendingInsights(userId: string): Promise<{
  narrative: string | null;
  anomalies: ReturnType<typeof detectUnusualSpending>;
} | null> {
  const cached = (await readCache(userId, "insights")) as {
    narrative: string | null;
    anomalies: ReturnType<typeof detectUnusualSpending>;
  } | null;
  if (cached) return cached;

  const thisMonthStart = startOfMonth(new Date());
  const trailingStart = new Date(thisMonthStart);
  trailingStart.setMonth(trailingStart.getMonth() - 3);

  const [thisMonthTxns, trailingTxns] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: thisMonthStart } },
    }),
    prisma.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: trailingStart, lt: thisMonthStart } },
    }),
  ]);

  const thisMonthByCategory: Record<string, number> = {};
  for (const t of thisMonthTxns) {
    thisMonthByCategory[t.category] = (thisMonthByCategory[t.category] ?? 0) + decToNumber(t.amount);
  }
  const trailingTotals: Record<string, number> = {};
  for (const t of trailingTxns) {
    trailingTotals[t.category] = (trailingTotals[t.category] ?? 0) + decToNumber(t.amount);
  }
  const trailingAverageByCategory: Record<string, number> = {};
  for (const [category, total] of Object.entries(trailingTotals)) {
    trailingAverageByCategory[category] = total / 3;
  }

  const anomalies = detectUnusualSpending(thisMonthByCategory, trailingAverageByCategory);
  if (anomalies.length === 0) {
    const result = { narrative: null, anomalies };
    await writeCache(userId, "insights", result);
    return result;
  }

  const resolved = await resolveAiModel();
  if (!resolved) return { narrative: null, anomalies };

  const lines = anomalies
    .map(
      (a) =>
        `- ${a.category}: ${formatCurrency(a.thisMonth)} this month vs a ${formatCurrency(a.trailingAverage)} average (+${a.percentOver}%)`,
    )
    .join("\n");

  // Runs unconditionally on every /finance page load - if the AI call fails,
  // still return the already-computed anomalies rather than losing them.
  let narrative: string | null = null;
  try {
    ({ text: narrative } = await generateText({
      model: resolved.model,
      system: SYSTEM,
      prompt: `These spending categories are running above their trailing 3-month average this month:\n${lines}\n\nWrite up to 2 short, plain-language sentences noting this - no advice unless it's obvious, just an honest observation grounded in these exact numbers.`,
    }));
  } catch {
    narrative = null;
  }

  const result = { narrative, anomalies };
  await writeCache(userId, "insights", result);
  return result;
}

export async function getOrGenerateHealthScoreNarrative(userId: string): Promise<{
  breakdown: ReturnType<typeof computeHealthScore>;
  narrative: string | null;
} | null> {
  const cached = (await readCache(userId, "healthscore")) as {
    breakdown: ReturnType<typeof computeHealthScore>;
    narrative: string | null;
  } | null;
  if (cached) return cached;

  const [{ avgMonthlyIncome, avgMonthlyExpenses }, emergencyGoal, recurring, budgets, netWorthInputs, snapshots] =
    await Promise.all([
      trailingMonthlyAverages(userId),
      prisma.savingsGoal.findFirst({ where: { userId, isEmergencyFund: true } }),
      prisma.recurringPayment.findMany({
        where: { userId, active: true, category: "Debt Payment", type: "EXPENSE" },
      }),
      prisma.budget.findMany({ where: { userId, month: startOfMonth(new Date()) } }),
      loadNetWorthInputs(userId),
      prisma.netWorthSnapshot.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 30,
      }),
    ]);

  const monthlyDebtPayments = recurring.reduce((sum, r) => sum + decToNumber(r.amount), 0);

  const thisMonthStart = startOfMonth(new Date());
  const thisMonthTxns = await prisma.transaction.findMany({
    where: { userId, type: "EXPENSE", date: { gte: thisMonthStart } },
  });
  const spendByCategory: Record<string, number> = {};
  for (const t of thisMonthTxns) {
    spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + decToNumber(t.amount);
  }
  const budgetCategoriesUnderLimit = budgets.filter(
    (b) => (spendByCategory[b.category] ?? 0) <= decToNumber(b.monthlyLimit),
  ).length;

  const { netWorth: currentNetWorth } = computeNetWorth(netWorthInputs);
  const monthAgoSnapshot = findSnapshotDaysAgo(snapshots, 30);
  const netWorthChangePercent = monthAgoSnapshot
    ? ((currentNetWorth - decToNumber(monthAgoSnapshot.netWorth)) / Math.abs(decToNumber(monthAgoSnapshot.netWorth) || 1)) * 100
    : null;

  const breakdown = computeHealthScore({
    avgMonthlyIncome,
    avgMonthlyExpenses,
    emergencyFundBalance: emergencyGoal ? decToNumber(emergencyGoal.currentAmount) : 0,
    monthlyDebtPayments,
    budgetCategoriesTotal: budgets.length,
    budgetCategoriesUnderLimit,
    netWorthChangePercent,
  });

  const resolved = await resolveAiModel();
  let narrative: string | null = null;
  // Runs unconditionally on every /finance page load - if the AI call fails,
  // still return the already-computed score breakdown rather than losing it.
  if (resolved) {
    try {
      const { text } = await generateText({
        model: resolved.model,
        system: SYSTEM,
        prompt: `Financial health score: ${breakdown.score}/100, built from: savings rate ${(breakdown.savingsRate.value * 100).toFixed(0)}% (score ${breakdown.savingsRate.score}), emergency fund covers ${breakdown.emergencyFund.months.toFixed(1)} months of expenses (score ${breakdown.emergencyFund.score}), debt-to-income ${(breakdown.debtToIncome.value * 100).toFixed(0)}% (score ${breakdown.debtToIncome.score}), budget adherence ${(breakdown.budgetAdherence.value * 100).toFixed(0)}% (score ${breakdown.budgetAdherence.score}).\n\nIn 1-2 sentences, name the single biggest lever to improve this score. Ground it only in the numbers above.`,
      });
      narrative = text;
    } catch {
      narrative = null;
    }
  }

  const result = { breakdown, narrative };
  await writeCache(userId, "healthscore", result);
  return result;
}

async function computeReportStats(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<Omit<FinancialReportSummary, keyof z.infer<typeof financialReportNarrativeSchema>>> {
  const txns = await prisma.transaction.findMany({
    where: { userId, date: { gte: periodStart, lt: periodEnd }, type: { in: ["INCOME", "EXPENSE"] } },
  });
  let income = 0;
  let expenses = 0;
  const byCategory: Record<string, number> = {};
  for (const t of txns) {
    const amt = decToNumber(t.amount);
    if (t.type === "INCOME") income += amt;
    else {
      expenses += amt;
      byCategory[t.category] = (byCategory[t.category] ?? 0) + amt;
    }
  }
  const topCategories = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return { income, expenses, netSavings: income - expenses, topCategories };
}

export async function generateFinancialReport(
  userId: string,
  period: ReportPeriod,
  periodStart: Date,
): Promise<FinancialReportSummary | null> {
  const resolved = await resolveAiModel();
  if (!resolved) return null;

  const periodEnd = new Date(periodStart);
  if (period === "DAY") periodEnd.setDate(periodEnd.getDate() + 1);
  else if (period === "WEEK") periodEnd.setDate(periodEnd.getDate() + 7);
  else if (period === "MONTH") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const stats = await computeReportStats(userId, periodStart, periodEnd);
  const label = period.toLowerCase();

  const { output } = await generateText({
    model: resolved.model,
    system: SYSTEM,
    prompt: `Here are the computed financial stats for this ${label} (${periodStart.toDateString()} - ${periodEnd.toDateString()}):\nIncome: ${formatCurrency(stats.income)}\nExpenses: ${formatCurrency(stats.expenses)}\nNet savings: ${formatCurrency(stats.netSavings)}\nTop spending categories: ${stats.topCategories.map((c) => `${c.category} (${formatCurrency(c.amount)})`).join(", ") || "none"}\n\nWrite a grounded ${label}ly overview, up to 5 honest insights, and up to 5 concrete recommendations - all based only on the numbers above. If there's too little data, keep lists short and say so rather than inventing content.`,
    output: Output.object({ schema: financialReportNarrativeSchema }),
  });

  const narrative = financialReportNarrativeSchema.parse(output);
  const summary: FinancialReportSummary = { ...stats, ...narrative };

  await prisma.financialReport.upsert({
    where: { userId_period_periodStart: { userId, period, periodStart } },
    update: { summary },
    create: { userId, period, periodStart, summary },
  });

  return summary;
}

// Lazily upserts today's net worth snapshot - called from the dashboard
// page on load, same "compute once per day" pattern as the AI caches.
export async function ensureTodaysNetWorthSnapshot(userId: string) {
  const date = todayDate();
  const existing = await prisma.netWorthSnapshot.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing) return existing;

  const inputs = await loadNetWorthInputs(userId);
  const { netWorth, totalAssets, totalLiabilities } = computeNetWorth(inputs);
  return prisma.netWorthSnapshot.upsert({
    where: { userId_date: { userId, date } },
    update: { netWorth, totalAssets, totalLiabilities },
    create: { userId, date, netWorth, totalAssets, totalLiabilities },
  });
}
