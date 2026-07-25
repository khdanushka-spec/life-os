import { z } from "zod";
import { Landmark, PiggyBank, Wallet, CreditCard, HandCoins } from "lucide-react";
import type {
  AccountType,
  AssetLiabilityKind,
  RecurringInterval,
  TransactionType,
} from "@/generated/prisma/client";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
  LOAN: "Loan",
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, typeof Landmark> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CASH: Wallet,
  CREDIT_CARD: CreditCard,
  LOAN: HandCoins,
};

// Balances on these account types represent amounts owed, not held -
// they're liabilities in net worth, not assets.
export const LIABILITY_ACCOUNT_TYPES: AccountType[] = ["CREDIT_CARD", "LOAN"];

export const TRANSACTION_CATEGORIES = [
  "Income",
  "Housing",
  "Utilities",
  "Groceries",
  "Transport",
  "Health",
  "Entertainment",
  "Shopping",
  "Dining",
  "Debt Payment",
  "Savings",
  "Insurance",
  "Education",
  "Other",
];

export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  SHARES: "Shares",
  ETF: "ETF",
  CRYPTO: "Crypto",
  PROPERTY: "Property",
  SUPERANNUATION: "Superannuation",
  OTHER: "Other",
};

export function formatCurrency(amount: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
  }).format(amount);
}

// Decimal fields come back from Prisma as Prisma.Decimal instances - this
// app treats money as plain numbers everywhere above the DB layer (see
// finance module plan: full decimal.js precision isn't warranted at
// personal-finance magnitudes, and the storage layer is still exact
// Decimal(14,2)).
export function decToNumber(d: { toNumber(): number } | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : d.toNumber();
}

export function computeNetWorth(input: {
  accounts: { type: AccountType; balance: number }[];
  investments: { currentValue: number }[];
  assetsLiabilities: { kind: AssetLiabilityKind; value: number }[];
}): { netWorth: number; totalAssets: number; totalLiabilities: number } {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const a of input.accounts) {
    if (LIABILITY_ACCOUNT_TYPES.includes(a.type)) totalLiabilities += a.balance;
    else totalAssets += a.balance;
  }
  for (const inv of input.investments) totalAssets += inv.currentValue;
  for (const al of input.assetsLiabilities) {
    if (al.kind === "ASSET") totalAssets += al.value;
    else totalLiabilities += al.value;
  }

  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
}

// Finds a snapshot roughly N days old (within a tolerance window) for a
// "change over the last month" comparison. Calls Date.now() internally
// so callers never do impure date math directly in a component body.
export function findSnapshotDaysAgo<T extends { date: Date }>(
  snapshots: T[],
  targetDays: number,
  toleranceDays = 5,
): T | undefined {
  const now = Date.now();
  return snapshots.find((s) => {
    const daysAgo = (now - s.date.getTime()) / 86_400_000;
    return daysAgo >= targetDays - toleranceDays && daysAgo <= targetDays + toleranceDays;
  });
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export type HealthScoreBreakdown = {
  score: number;
  savingsRate: { value: number; score: number };
  emergencyFund: { months: number; score: number };
  debtToIncome: { value: number; score: number };
  budgetAdherence: { value: number; score: number };
  netWorthTrend: { changePercent: number | null; modifier: number };
};

// A documented, deterministic weighted formula - never AI-guessed.
// Weights: savings rate 30%, emergency fund 25%, debt-to-income 20%,
// budget adherence 25%, plus a small +/-5 net-worth-trend modifier when
// there's enough history to compute one.
export function computeHealthScore(input: {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  emergencyFundBalance: number;
  monthlyDebtPayments: number;
  budgetCategoriesTotal: number;
  budgetCategoriesUnderLimit: number;
  netWorthChangePercent: number | null;
}): HealthScoreBreakdown {
  const savingsRateValue =
    input.avgMonthlyIncome > 0
      ? (input.avgMonthlyIncome - input.avgMonthlyExpenses) / input.avgMonthlyIncome
      : 0;
  const savingsRateScore = clampScore((savingsRateValue / 0.2) * 100);

  const emergencyMonths =
    input.avgMonthlyExpenses > 0 ? input.emergencyFundBalance / input.avgMonthlyExpenses : 0;
  const emergencyScore = clampScore((emergencyMonths / 6) * 100);

  const debtToIncomeValue =
    input.avgMonthlyIncome > 0 ? input.monthlyDebtPayments / input.avgMonthlyIncome : 0;
  const debtScore = clampScore(100 - (debtToIncomeValue / 0.4) * 100);

  const budgetAdherenceValue =
    input.budgetCategoriesTotal > 0
      ? input.budgetCategoriesUnderLimit / input.budgetCategoriesTotal
      : 1;
  const budgetScore = clampScore(budgetAdherenceValue * 100);

  const base =
    savingsRateScore * 0.3 + emergencyScore * 0.25 + debtScore * 0.2 + budgetScore * 0.25;

  const trendModifier =
    input.netWorthChangePercent == null
      ? 0
      : Math.max(-5, Math.min(5, input.netWorthChangePercent / 2));

  return {
    score: clampScore(base + trendModifier),
    savingsRate: { value: savingsRateValue, score: savingsRateScore },
    emergencyFund: { months: emergencyMonths, score: emergencyScore },
    debtToIncome: { value: debtToIncomeValue, score: debtScore },
    budgetAdherence: { value: budgetAdherenceValue, score: budgetScore },
    netWorthTrend: { changePercent: input.netWorthChangePercent, modifier: trendModifier },
  };
}

// Advances a date by one occurrence of the given interval using calendar
// arithmetic (setMonth/setFullYear) for MONTHLY/QUARTERLY/YEARLY so a
// "due on the 1st" bill stays on the 1st indefinitely, rather than
// drifting the way a fixed day-count step would across months of
// different lengths. WEEKLY/FORTNIGHTLY are exact day counts already.
export function advanceByInterval(date: Date, interval: RecurringInterval): Date {
  const next = new Date(date);
  switch (interval) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "FORTNIGHTLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

// All occurrences of a recurring item landing in [rangeStart, rangeEnd),
// walking forward from nextDueDate (which may be before, inside, or
// after the range). Used by the financial calendar.
export function occurrencesInRange(
  nextDueDate: Date,
  interval: RecurringInterval,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const occurrences: Date[] = [];
  let cursor = new Date(nextDueDate);
  // Guard against a pathological loop if something is misconfigured.
  let iterations = 0;
  while (cursor < rangeStart && iterations < 1000) {
    cursor = advanceByInterval(cursor, interval);
    iterations++;
  }
  while (cursor < rangeEnd && iterations < 2000) {
    if (cursor >= rangeStart) occurrences.push(new Date(cursor));
    cursor = advanceByInterval(cursor, interval);
    iterations++;
  }
  return occurrences;
}

export type CashFlowProjection = {
  days: number;
  startingBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  projectedBalance: number;
};

// Projects only known recurring items forward - never guesses at
// discretionary spending. This is the number the AI narrative is built
// on top of, not something the AI predicts itself.
export function projectCashFlow(
  days: number,
  startingBalance: number,
  recurring: { type: TransactionType; amount: number; interval: RecurringInterval; nextDueDate: Date }[],
): CashFlowProjection {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + days);

  let incomeTotal = 0;
  let expenseTotal = 0;
  for (const r of recurring) {
    const count = occurrencesInRange(r.nextDueDate, r.interval, now, horizon).length;
    if (r.type === "INCOME") incomeTotal += r.amount * count;
    else if (r.type === "EXPENSE") expenseTotal += r.amount * count;
  }

  return {
    days,
    startingBalance,
    incomeTotal,
    expenseTotal,
    projectedBalance: startingBalance + incomeTotal - expenseTotal,
  };
}

export type SpendingAnomaly = {
  category: string;
  thisMonth: number;
  trailingAverage: number;
  percentOver: number;
};

const ANOMALY_THRESHOLD_PERCENT = 50;
const ANOMALY_MIN_DOLLARS = 30;

// This month's category spend vs trailing-3-month average, thresholded
// so tiny categories don't produce noise. Purely computed - the AI layer
// only explains anomalies this function already found.
export function detectUnusualSpending(
  thisMonthByCategory: Record<string, number>,
  trailingAverageByCategory: Record<string, number>,
): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = [];
  for (const [category, thisMonth] of Object.entries(thisMonthByCategory)) {
    if (thisMonth < ANOMALY_MIN_DOLLARS) continue;
    const trailingAverage = trailingAverageByCategory[category] ?? 0;
    if (trailingAverage === 0) continue;
    const percentOver = ((thisMonth - trailingAverage) / trailingAverage) * 100;
    if (percentOver >= ANOMALY_THRESHOLD_PERCENT) {
      anomalies.push({ category, thisMonth, trailingAverage, percentOver: Math.round(percentOver) });
    }
  }
  return anomalies.sort((a, b) => b.percentOver - a.percentOver);
}

// The AI only ever fills in these narrative fields - every number in a
// FinancialReport.summary is computed separately and merged in, never
// asked of the model.
export const financialReportNarrativeSchema = z.object({
  overview: z.string(),
  insights: z.array(z.string()).max(5),
  recommendations: z.array(z.string()).max(5),
});
export type FinancialReportNarrative = z.infer<typeof financialReportNarrativeSchema>;

export type FinancialReportSummary = FinancialReportNarrative & {
  income: number;
  expenses: number;
  netSavings: number;
  topCategories: { category: string; amount: number }[];
};
