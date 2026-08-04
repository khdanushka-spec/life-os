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
// Decimal(14,2)). ALWAYS call this server-side, before a Decimal-bearing
// object is passed as a prop to a "use client" component - Decimal does
// not survive that boundary as a real instance (it arrives without a
// working .toNumber()), so this also accepts the string/plain-object
// shapes it can turn into as a defensive fallback.
export function decToNumber(
  d: { toNumber(): number } | string | number | null | undefined,
): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  if (typeof d === "string") return Number(d);
  if (typeof d.toNumber === "function") return d.toNumber();
  return Number(d);
}

// fxRatesToAud: currency code -> AUD value of 1 unit (see lib/fx.ts). An
// account/investment in a non-AUD currency with no matching rate is
// excluded from the totals rather than counted at face value - a missing
// LKR rate must never silently add e.g. 500,000 straight into an AUD net
// worth. unconvertedCount tells the caller how many items got skipped so
// it can surface that rather than pretending the total is complete.
export function computeNetWorth(input: {
  accounts: { type: AccountType; balance: number; currency?: string }[];
  investments: { currentValue: number; currency?: string }[];
  assetsLiabilities: { kind: AssetLiabilityKind; value: number }[];
  fxRatesToAud?: Record<string, number> | null;
}): { netWorth: number; totalAssets: number; totalLiabilities: number; unconvertedCount: number } {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let unconvertedCount = 0;

  function toAud(amount: number, currency: string | undefined): number | null {
    if (!currency || currency === "AUD") return amount;
    const rate = input.fxRatesToAud?.[currency];
    return rate == null ? null : amount * rate;
  }

  for (const a of input.accounts) {
    const converted = toAud(a.balance, a.currency);
    if (converted == null) {
      unconvertedCount++;
      continue;
    }
    if (LIABILITY_ACCOUNT_TYPES.includes(a.type)) totalLiabilities += converted;
    else totalAssets += converted;
  }
  for (const inv of input.investments) {
    const converted = toAud(inv.currentValue, inv.currency);
    if (converted == null) {
      unconvertedCount++;
      continue;
    }
    totalAssets += converted;
  }
  for (const al of input.assetsLiabilities) {
    if (al.kind === "ASSET") totalAssets += al.value;
    else totalLiabilities += al.value;
  }

  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities, unconvertedCount };
}

export const LOW_BALANCE_THRESHOLD = 200;
export const LOW_BALANCE_WINDOW_DAYS = 3;

// Only liquid account types can meaningfully "run low" - a LOAN or
// CREDIT_CARD balance dropping is the opposite of a problem.
const LIQUID_ACCOUNT_TYPES: AccountType[] = ["CHECKING", "SAVINGS", "CASH"];

export type LowBalanceAlert = {
  accountId: string;
  accountName: string;
  currency: string;
  currentBalance: number;
  projectedBalance: number;
  // True when the account is under the threshold right now, as opposed to
  // only being projected to cross it because of an upcoming bill.
  alreadyLow: boolean;
  upcoming: { name: string; amount: number; type: TransactionType; date: Date }[];
};

// Flags a liquid account two ways: (1) it's under the threshold right now,
// full stop - always worth a red alert regardless of recurring data - or
// (2) it's currently fine but a recurring payment nominated to it would
// push it under the threshold within the window. (1) doesn't need any
// recurring data at all; (2) does, and stays silent with none ("no data
// means no alert, not a false one").
export function computeLowBalanceAlerts(
  accounts: { id: string; name: string; type: AccountType; balance: number; currency: string }[],
  recurring: {
    name: string;
    accountId: string | null;
    active: boolean;
    type: TransactionType;
    amount: number;
    interval: RecurringInterval;
    nextDueDate: Date;
  }[],
  now: Date = new Date(),
): LowBalanceAlert[] {
  const rangeEnd = new Date(now.getTime() + LOW_BALANCE_WINDOW_DAYS * 86_400_000);
  const alerts: LowBalanceAlert[] = [];

  for (const account of accounts) {
    if (!LIQUID_ACCOUNT_TYPES.includes(account.type)) continue;
    const alreadyLow = account.balance < LOW_BALANCE_THRESHOLD;

    const linked = recurring.filter((r) => r.accountId === account.id && r.active);
    const upcoming: LowBalanceAlert["upcoming"] = [];
    let delta = 0;
    for (const r of linked) {
      for (const date of occurrencesInRange(r.nextDueDate, r.interval, now, rangeEnd)) {
        delta += r.type === "INCOME" ? r.amount : -r.amount;
        upcoming.push({ name: r.name, amount: r.amount, type: r.type, date });
      }
    }

    const projectedBalance = account.balance + delta;
    if (!alreadyLow && (upcoming.length === 0 || projectedBalance >= LOW_BALANCE_THRESHOLD)) continue;

    alerts.push({
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      currentBalance: account.balance,
      projectedBalance,
      alreadyLow,
      upcoming: upcoming.sort((a, b) => a.date.getTime() - b.date.getTime()),
    });
  }

  return alerts;
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

// Recurrence math now lives in lib/date.ts (shared with Tasks'
// repeatInterval) - re-exported here so nothing else in this module
// needs to change.
export { advanceByInterval, occurrencesInRange } from "@/lib/date";
import { occurrencesInRange } from "@/lib/date";

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
