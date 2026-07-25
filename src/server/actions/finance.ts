"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import {
  AccountType,
  TransactionType,
  RecurringInterval,
  InvestmentType,
  AssetLiabilityKind,
  type ReportPeriod,
} from "@/generated/prisma/client";
import {
  getOrGenerateCashflowNarrative,
  getOrGenerateSpendingInsights,
  getOrGenerateHealthScoreNarrative,
  generateFinancialReport,
} from "@/lib/ai/finance";

function revalidateFinance(subpath?: string) {
  revalidatePath("/finance");
  revalidatePath("/home");
  if (subpath) revalidatePath(subpath);
}

// ---------- Accounts ----------

const accountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.nativeEnum(AccountType),
  balance: z.coerce.number().finite(),
  creditLimit: z.coerce.number().finite().optional(),
  interestRate: z.coerce.number().finite().optional(),
  currency: z.string().trim().length(3).default("AUD"),
});

export async function createAccountAction(formData: FormData) {
  const dbUser = await requireDbUser();
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    balance: formData.get("balance"),
    creditLimit: formData.get("creditLimit") || undefined,
    interestRate: formData.get("interestRate") || undefined,
    currency: formData.get("currency") || "AUD",
  });
  if (!parsed.success) return;

  await prisma.financialAccount.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateFinance("/finance/accounts");
}

export async function archiveAccountAction(accountId: string) {
  const dbUser = await requireDbUser();
  // Archive rather than delete - a hard delete would cascade-drop every
  // transaction ever logged against this account.
  await prisma.financialAccount.updateMany({
    where: { id: accountId, userId: dbUser.id },
    data: { archived: true },
  });
  revalidateFinance("/finance/accounts");
}

// ---------- Transactions ----------

const transactionSchema = z.object({
  accountId: z.string().uuid(),
  type: z.nativeEnum(TransactionType),
  amount: z.coerce.number().positive(),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().max(280).optional(),
  date: z.coerce.date(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

// TRANSFER is tracked as a labeled transaction only in this pass - it
// doesn't move balance between two accounts (that needs a second
// accountId this schema doesn't have yet). INCOME/EXPENSE fully adjust
// the linked account's balance.
export async function createTransactionAction(formData: FormData) {
  const dbUser = await requireDbUser();
  const tagsRaw = formData.get("tags");
  const parsed = transactionSchema.safeParse({
    accountId: formData.get("accountId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
    tags: typeof tagsRaw === "string" && tagsRaw.length ? tagsRaw.split(",") : undefined,
  });
  if (!parsed.success) return;
  const { accountId, type, amount, ...rest } = parsed.data;

  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId: dbUser.id },
  });
  if (!account) return;

  const delta = type === "INCOME" ? amount : type === "EXPENSE" ? -amount : 0;

  await prisma.$transaction([
    prisma.transaction.create({
      data: { userId: dbUser.id, accountId, type, amount, currency: account.currency, ...rest },
    }),
    prisma.financialAccount.update({
      where: { id: accountId },
      data: { balance: { increment: delta } },
    }),
  ]);

  revalidateFinance("/finance/transactions");
}

export async function deleteTransactionAction(transactionId: string) {
  const dbUser = await requireDbUser();
  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, userId: dbUser.id },
  });
  if (!txn) return;

  const delta =
    txn.type === "INCOME" ? -txn.amount.toNumber() : txn.type === "EXPENSE" ? txn.amount.toNumber() : 0;

  await prisma.$transaction([
    prisma.transaction.delete({ where: { id: transactionId } }),
    prisma.financialAccount.update({
      where: { id: txn.accountId },
      data: { balance: { increment: delta } },
    }),
  ]);

  revalidateFinance("/finance/transactions");
}

// ---------- Recurring payments (bills/subscriptions) ----------

const recurringSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.coerce.number().positive(),
  type: z.nativeEnum(TransactionType),
  category: z.string().trim().min(1).max(60),
  interval: z.nativeEnum(RecurringInterval),
  nextDueDate: z.coerce.date(),
  autoPay: z.coerce.boolean().optional(),
});

export async function createRecurringAction(formData: FormData) {
  const dbUser = await requireDbUser();
  const parsed = recurringSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    category: formData.get("category"),
    interval: formData.get("interval"),
    nextDueDate: formData.get("nextDueDate"),
    autoPay: formData.get("autoPay") === "on",
  });
  if (!parsed.success) return;

  await prisma.recurringPayment.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateFinance("/finance/recurring");
}

export async function toggleRecurringActiveAction(id: string, active: boolean) {
  const dbUser = await requireDbUser();
  await prisma.recurringPayment.updateMany({
    where: { id, userId: dbUser.id },
    data: { active },
  });
  revalidateFinance("/finance/recurring");
}

export async function deleteRecurringAction(id: string) {
  const dbUser = await requireDbUser();
  await prisma.recurringPayment.deleteMany({ where: { id, userId: dbUser.id } });
  revalidateFinance("/finance/recurring");
}

// ---------- Budgets ----------

const budgetSchema = z.object({
  category: z.string().trim().min(1).max(60),
  monthlyLimit: z.coerce.number().positive(),
  month: z.coerce.date(),
});

export async function setBudgetAction(formData: FormData) {
  const dbUser = await requireDbUser();
  const parsed = budgetSchema.safeParse({
    category: formData.get("category"),
    monthlyLimit: formData.get("monthlyLimit"),
    month: formData.get("month"),
  });
  if (!parsed.success) return;
  const { category, monthlyLimit, month } = parsed.data;

  await prisma.budget.upsert({
    where: { userId_category_month: { userId: dbUser.id, category, month } },
    update: { monthlyLimit },
    create: { userId: dbUser.id, category, monthlyLimit, month },
  });
  revalidateFinance("/finance/budgets");
}

export async function deleteBudgetAction(id: string) {
  const dbUser = await requireDbUser();
  await prisma.budget.deleteMany({ where: { id, userId: dbUser.id } });
  revalidateFinance("/finance/budgets");
}

// ---------- Savings goals ----------

const goalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).optional(),
  targetDate: z.coerce.date().optional(),
  isEmergencyFund: z.coerce.boolean().optional(),
});

export async function createGoalAction(formData: FormData) {
  const dbUser = await requireDbUser();
  const parsed = goalSchema.safeParse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    currentAmount: formData.get("currentAmount") || undefined,
    targetDate: formData.get("targetDate") || undefined,
    isEmergencyFund: formData.get("isEmergencyFund") === "on",
  });
  if (!parsed.success) return;

  await prisma.savingsGoal.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateFinance("/finance/goals");
}

export async function updateGoalProgressAction(goalId: string, currentAmount: number) {
  const dbUser = await requireDbUser();
  if (!Number.isFinite(currentAmount) || currentAmount < 0) return;
  await prisma.savingsGoal.updateMany({
    where: { id: goalId, userId: dbUser.id },
    data: { currentAmount },
  });
  revalidateFinance("/finance/goals");
}

export async function deleteGoalAction(goalId: string) {
  const dbUser = await requireDbUser();
  await prisma.savingsGoal.deleteMany({ where: { id: goalId, userId: dbUser.id } });
  revalidateFinance("/finance/goals");
}

// ---------- Investments ----------

const investmentSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.nativeEnum(InvestmentType),
  units: z.coerce.number().finite().optional(),
  costBasis: z.coerce.number().min(0),
  currentValue: z.coerce.number().min(0),
  currency: z.string().trim().length(3).default("AUD"),
  notes: z.string().trim().max(280).optional(),
});

export async function createInvestmentAction(formData: FormData) {
  const dbUser = await requireDbUser();
  const parsed = investmentSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    units: formData.get("units") || undefined,
    costBasis: formData.get("costBasis"),
    currentValue: formData.get("currentValue"),
    currency: formData.get("currency") || "AUD",
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return;

  await prisma.investment.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateFinance("/finance/investments");
}

export async function updateInvestmentValueAction(investmentId: string, currentValue: number) {
  const dbUser = await requireDbUser();
  if (!Number.isFinite(currentValue) || currentValue < 0) return;
  await prisma.investment.updateMany({
    where: { id: investmentId, userId: dbUser.id },
    data: { currentValue },
  });
  revalidateFinance("/finance/investments");
}

export async function deleteInvestmentAction(investmentId: string) {
  const dbUser = await requireDbUser();
  await prisma.investment.deleteMany({ where: { id: investmentId, userId: dbUser.id } });
  revalidateFinance("/finance/investments");
}

// ---------- Assets & liabilities ----------

const assetLiabilitySchema = z.object({
  kind: z.nativeEnum(AssetLiabilityKind),
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(60),
  value: z.coerce.number().min(0),
});

export async function createAssetLiabilityAction(formData: FormData) {
  const dbUser = await requireDbUser();
  const parsed = assetLiabilitySchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    category: formData.get("category"),
    value: formData.get("value"),
  });
  if (!parsed.success) return;

  await prisma.assetLiability.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateFinance("/finance/investments");
}

export async function deleteAssetLiabilityAction(id: string) {
  const dbUser = await requireDbUser();
  await prisma.assetLiability.deleteMany({ where: { id, userId: dbUser.id } });
  revalidateFinance("/finance/investments");
}

// ---------- AI ----------

export async function regenerateCashflowNarrativeAction() {
  const dbUser = await requireDbUser();
  const today = new Date(new Date().toISOString().slice(0, 10));
  await prisma.financialAiCache
    .delete({ where: { userId_date_kind: { userId: dbUser.id, date: today, kind: "cashflow" } } })
    .catch(() => {});
  const result = await getOrGenerateCashflowNarrative(dbUser.id);
  revalidateFinance();
  return result;
}

export async function regenerateSpendingInsightsAction() {
  const dbUser = await requireDbUser();
  const today = new Date(new Date().toISOString().slice(0, 10));
  await prisma.financialAiCache
    .delete({ where: { userId_date_kind: { userId: dbUser.id, date: today, kind: "insights" } } })
    .catch(() => {});
  const result = await getOrGenerateSpendingInsights(dbUser.id);
  revalidateFinance();
  return result;
}

export async function regenerateHealthScoreNarrativeAction() {
  const dbUser = await requireDbUser();
  const today = new Date(new Date().toISOString().slice(0, 10));
  await prisma.financialAiCache
    .delete({ where: { userId_date_kind: { userId: dbUser.id, date: today, kind: "healthscore" } } })
    .catch(() => {});
  const result = await getOrGenerateHealthScoreNarrative(dbUser.id);
  revalidateFinance();
  return result;
}

export async function generateFinancialReportAction(period: ReportPeriod, periodStart: string) {
  const dbUser = await requireDbUser();
  const summary = await generateFinancialReport(dbUser.id, period, new Date(periodStart));
  revalidateFinance("/finance/reports");
  return summary;
}
