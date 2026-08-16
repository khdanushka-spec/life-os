"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { brisbaneToday } from "@/lib/date";
import {
  AccountType,
  TransactionType,
  RecurringInterval,
  InvestmentType,
  AssetLiabilityKind,
  type Prisma,
  type ReportPeriod,
} from "@/generated/prisma/client";
import {
  getOrGenerateCashflowNarrative,
  getOrGenerateSpendingInsights,
  getOrGenerateHealthScoreNarrative,
  generateFinancialReport,
} from "@/lib/ai/finance";
import { parseStatementCsv, parseStatementPdf, flagDuplicates, matchTransferAccounts } from "@/lib/statement-import";

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

const accountEditSchema = z.object({
  name: z.string().trim().min(1).max(80),
  balance: z.coerce.number().finite(),
});

export async function updateAccountAction(accountId: string, formData: FormData) {
  const dbUser = await requireDbUser();
  const parsed = accountEditSchema.safeParse({
    name: formData.get("name"),
    balance: formData.get("balance"),
  });
  if (!parsed.success) return;

  await prisma.financialAccount.updateMany({
    where: { id: accountId, userId: dbUser.id },
    data: parsed.data,
  });
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
  toAccountId: z.string().uuid().optional(),
});

export async function createTransactionAction(formData: FormData) {
  const dbUser = await requireDbUser();
  const tagsRaw = formData.get("tags");
  const toAccountIdRaw = formData.get("toAccountId");
  const parsed = transactionSchema.safeParse({
    accountId: formData.get("accountId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
    tags: typeof tagsRaw === "string" && tagsRaw.length ? tagsRaw.split(",") : undefined,
    toAccountId: typeof toAccountIdRaw === "string" && toAccountIdRaw ? toAccountIdRaw : undefined,
  });
  if (!parsed.success) return;
  const { accountId, type, amount, toAccountId, ...rest } = parsed.data;

  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId: dbUser.id },
  });
  if (!account) return;

  if (type === "TRANSFER") {
    if (!toAccountId || toAccountId === accountId) return;
    const toAccount = await prisma.financialAccount.findFirst({
      where: { id: toAccountId, userId: dbUser.id },
    });
    // Same-currency only for now - converting an AUD transfer into a
    // foreign-currency account would need an FX rate applied to the
    // credited leg, which this doesn't attempt yet.
    if (!toAccount || toAccount.currency !== account.currency) return;

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: dbUser.id,
          accountId,
          type,
          amount: -amount,
          currency: account.currency,
          transferAccountId: toAccountId,
          ...rest,
          description: rest.description ? `Transfer to ${toAccount.name} — ${rest.description}` : `Transfer to ${toAccount.name}`,
        },
      }),
      prisma.transaction.create({
        data: {
          userId: dbUser.id,
          accountId: toAccountId,
          type,
          amount,
          currency: toAccount.currency,
          transferAccountId: accountId,
          ...rest,
          description: rest.description ? `Transfer from ${account.name} — ${rest.description}` : `Transfer from ${account.name}`,
        },
      }),
      prisma.financialAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } }),
      prisma.financialAccount.update({ where: { id: toAccountId }, data: { balance: { increment: amount } } }),
    ]);
    revalidateFinance("/finance/transactions");
    return;
  }

  const delta = type === "INCOME" ? amount : -amount;

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

const transactionEditSchema = z.object({
  amount: z.coerce.number().positive(),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().max(280).optional(),
  date: z.coerce.date(),
});

// Amount/date/category/description only - account and type stay fixed to
// keep this a plain field edit rather than reopening the cross-account
// balance-transfer logic createTransactionAction/deleteTransactionAction
// already handle. TRANSFER rows are rejected outright: their amount is
// signed and paired across two accounts (see schema comment on
// transferAccountId), so an edit here would desync the other leg.
export async function updateTransactionAction(transactionId: string, formData: FormData) {
  const dbUser = await requireDbUser();
  const txn = await prisma.transaction.findFirst({ where: { id: transactionId, userId: dbUser.id } });
  if (!txn || txn.type === "TRANSFER") return;

  const parsed = transactionEditSchema.safeParse({
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
  });
  if (!parsed.success) return;

  const oldAmount = txn.amount.toNumber();
  // Reverses the old amount's effect on the balance and applies the new
  // one, in the same direction createTransactionAction/deleteTransactionAction
  // already use for this account's type.
  const balanceDelta = txn.type === "INCOME" ? parsed.data.amount - oldAmount : oldAmount - parsed.data.amount;

  await prisma.$transaction([
    prisma.transaction.update({ where: { id: transactionId }, data: parsed.data }),
    prisma.financialAccount.update({
      where: { id: txn.accountId },
      data: { balance: { increment: balanceDelta } },
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

  if (txn.type === "TRANSFER") {
    // Best-effort pairing: the other leg of this same transfer, on the
    // other account, dated identically with the opposite signed amount.
    // Not a hard foreign key (see schema comment), so an unmatched leg
    // (e.g. the pair was already partially deleted) just reverses itself.
    const pair = txn.transferAccountId
      ? await prisma.transaction.findFirst({
          where: {
            userId: dbUser.id,
            accountId: txn.transferAccountId,
            transferAccountId: txn.accountId,
            type: "TRANSFER",
            date: txn.date,
            amount: txn.amount.negated(),
          },
        })
      : null;

    await prisma.$transaction([
      prisma.transaction.delete({ where: { id: transactionId } }),
      prisma.financialAccount.update({
        where: { id: txn.accountId },
        data: { balance: { increment: -txn.amount.toNumber() } },
      }),
      ...(pair
        ? [
            prisma.transaction.delete({ where: { id: pair.id } }),
            prisma.financialAccount.update({
              where: { id: pair.accountId },
              data: { balance: { increment: -pair.amount.toNumber() } },
            }),
          ]
        : []),
    ]);
    revalidateFinance("/finance/transactions");
    return;
  }

  const delta = txn.type === "INCOME" ? -txn.amount.toNumber() : txn.amount.toNumber();

  await prisma.$transaction([
    prisma.transaction.delete({ where: { id: transactionId } }),
    prisma.financialAccount.update({
      where: { id: txn.accountId },
      data: { balance: { increment: delta } },
    }),
  ]);

  revalidateFinance("/finance/transactions");
}

// ---------- Bank statement import ----------

export type StatementImportCandidate = {
  date: string; // ISO - Dates don't round-trip through client state as cleanly as through the RSC boundary
  description: string;
  amount: number;
  isDuplicate: boolean;
  matchedAccountId: string | null;
  uncertainSign: boolean;
};

export async function parseStatementAction(formData: FormData): Promise<
  | {
      ok: true;
      candidates: StatementImportCandidate[];
      // Same-currency accounts the review screen can link a row to as a
      // transfer, whether or not the auto-match found one.
      linkableAccounts: { id: string; name: string }[];
    }
  | { ok: false; error: string }
> {
  const dbUser = await requireDbUser();
  const accountId = formData.get("accountId");
  const file = formData.get("file");
  if (typeof accountId !== "string" || !accountId) return { ok: false, error: "Choose an account first." };
  if (!(file instanceof File)) return { ok: false, error: "Choose a CSV or PDF file." };

  const account = await prisma.financialAccount.findFirst({ where: { id: accountId, userId: dbUser.id } });
  if (!account) return { ok: false, error: "Account not found." };

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const { candidates, error } = isPdf
    ? await parseStatementPdf(Buffer.from(await file.arrayBuffer()))
    : parseStatementCsv(await file.text());
  if (error) return { ok: false, error };

  const [duplicateFlags, matches, linkableAccounts] = await Promise.all([
    flagDuplicates(dbUser.id, accountId, candidates),
    matchTransferAccounts(dbUser.id, accountId, account.currency, candidates),
    prisma.financialAccount.findMany({
      where: { userId: dbUser.id, id: { not: accountId }, archived: false, currency: account.currency },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    ok: true,
    candidates: candidates.map((c, i) => ({
      date: c.date.toISOString(),
      description: c.description,
      amount: c.amount,
      isDuplicate: duplicateFlags[i],
      matchedAccountId: matches[i]?.id ?? null,
      uncertainSign: c.uncertainSign ?? false,
    })),
    linkableAccounts,
  };
}

export async function importStatementTransactionsAction(
  accountId: string,
  rows: { date: string; description: string; amount: number; linkAccountId?: string | null }[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const dbUser = await requireDbUser();
  if (rows.length === 0) return { ok: false, error: "Nothing selected." };

  const account = await prisma.financialAccount.findFirst({ where: { id: accountId, userId: dbUser.id } });
  if (!account) return { ok: false, error: "Account not found." };

  // Rows linked to another account become a real paired TRANSFER (both
  // legs, both balances) instead of a one-sided EXPENSE/INCOME - same
  // shape createTransactionAction already uses. Verify every linked
  // account up front so one bad id doesn't fail partway through the batch.
  const linkedIds = [...new Set(rows.map((r) => r.linkAccountId).filter((id): id is string => Boolean(id)))];
  const linkedAccounts =
    linkedIds.length > 0
      ? await prisma.financialAccount.findMany({
          where: { id: { in: linkedIds }, userId: dbUser.id, currency: account.currency },
        })
      : [];
  const linkedById = new Map(linkedAccounts.map((a) => [a.id, a]));

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  let ownBalanceDelta = 0;
  const otherBalanceDeltas = new Map<string, number>();

  for (const r of rows) {
    const linked = r.linkAccountId ? linkedById.get(r.linkAccountId) : undefined;
    const description = r.description.trim().slice(0, 280) || undefined;
    const date = new Date(r.date);

    if (linked) {
      ownBalanceDelta += r.amount;
      otherBalanceDeltas.set(linked.id, (otherBalanceDeltas.get(linked.id) ?? 0) - r.amount);
      ops.push(
        prisma.transaction.create({
          data: {
            userId: dbUser.id,
            accountId,
            type: "TRANSFER",
            amount: r.amount,
            currency: account.currency,
            transferAccountId: linked.id,
            category: "Transfer",
            description,
            date,
          },
        }),
        prisma.transaction.create({
          data: {
            userId: dbUser.id,
            accountId: linked.id,
            type: "TRANSFER",
            amount: -r.amount,
            currency: linked.currency,
            transferAccountId: accountId,
            category: "Transfer",
            description,
            date,
          },
        }),
      );
    } else {
      ownBalanceDelta += r.amount;
      ops.push(
        prisma.transaction.create({
          data: {
            userId: dbUser.id,
            accountId,
            type: r.amount > 0 ? "INCOME" : "EXPENSE",
            amount: Math.abs(r.amount),
            currency: account.currency,
            category: "Other",
            description,
            date,
          },
        }),
      );
    }
  }

  ops.push(prisma.financialAccount.update({ where: { id: accountId }, data: { balance: { increment: ownBalanceDelta } } }));
  for (const [id, delta] of otherBalanceDeltas) {
    ops.push(prisma.financialAccount.update({ where: { id }, data: { balance: { increment: delta } } }));
  }

  await prisma.$transaction(ops);

  revalidateFinance("/finance/transactions");
  return { ok: true, count: rows.length };
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
  accountId: z.string().uuid().nullable().optional(),
});

// Verifies the nominated account actually belongs to this user before it's
// allowed to be linked - accountId arrives from client input (a <Select>),
// so this is the only thing stopping one user's recurring payment from
// being wired to another user's account.
async function resolveOwnedAccountId(userId: string, accountId: string | null | undefined): Promise<string | null> {
  if (!accountId) return null;
  const owned = await prisma.financialAccount.findFirst({ where: { id: accountId, userId }, select: { id: true } });
  return owned?.id ?? null;
}

export async function createRecurringAction(formData: FormData) {
  const dbUser = await requireDbUser();
  const rawAccountId = formData.get("accountId");
  const parsed = recurringSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    category: formData.get("category"),
    interval: formData.get("interval"),
    nextDueDate: formData.get("nextDueDate"),
    autoPay: formData.get("autoPay") === "on",
    accountId: rawAccountId && rawAccountId !== "none" ? rawAccountId : null,
  });
  if (!parsed.success) return;

  const accountId = await resolveOwnedAccountId(dbUser.id, parsed.data.accountId);
  await prisma.recurringPayment.create({
    data: { userId: dbUser.id, ...parsed.data, accountId, autoPay: parsed.data.autoPay && accountId != null },
  });
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

// autoPay only means anything with a nominated account - toggling it on
// without one is a no-op the automation would silently skip anyway, so
// this rejects that combination up front instead.
export async function toggleRecurringAutoPayAction(id: string, autoPay: boolean) {
  const dbUser = await requireDbUser();
  const existing = await prisma.recurringPayment.findFirst({ where: { id, userId: dbUser.id }, select: { accountId: true } });
  if (!existing) return;
  if (autoPay && !existing.accountId) return;
  await prisma.recurringPayment.updateMany({ where: { id, userId: dbUser.id }, data: { autoPay } });
  revalidateFinance("/finance/recurring");
}

export async function setRecurringAccountAction(id: string, accountId: string | null) {
  const dbUser = await requireDbUser();
  const resolvedAccountId = await resolveOwnedAccountId(dbUser.id, accountId);
  await prisma.recurringPayment.updateMany({
    where: { id, userId: dbUser.id },
    // Clearing the account also turns autoPay off - it can't stay on
    // pointing at nothing.
    data: { accountId: resolvedAccountId, ...(resolvedAccountId == null ? { autoPay: false } : {}) },
  });
  revalidateFinance("/finance/recurring");
}

export async function setRecurringCategoryAction(id: string, category: string) {
  const dbUser = await requireDbUser();
  const parsed = z.string().trim().min(1).max(60).safeParse(category);
  if (!parsed.success) return;
  await prisma.recurringPayment.updateMany({
    where: { id, userId: dbUser.id },
    data: { category: parsed.data },
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
  const today = brisbaneToday();
  await prisma.financialAiCache
    .delete({ where: { userId_date_kind: { userId: dbUser.id, date: today, kind: "cashflow" } } })
    .catch(() => {});
  const result = await getOrGenerateCashflowNarrative(dbUser.id);
  revalidateFinance();
  return result;
}

export async function regenerateSpendingInsightsAction() {
  const dbUser = await requireDbUser();
  const today = brisbaneToday();
  await prisma.financialAiCache
    .delete({ where: { userId_date_kind: { userId: dbUser.id, date: today, kind: "insights" } } })
    .catch(() => {});
  const result = await getOrGenerateSpendingInsights(dbUser.id);
  revalidateFinance();
  return result;
}

export async function regenerateHealthScoreNarrativeAction() {
  const dbUser = await requireDbUser();
  const today = brisbaneToday();
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
