import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionsList } from "@/components/finance/transactions-list";
import { TransactionsFilterBar } from "@/components/finance/transactions-filter-bar";
import { TransactionsCalendar } from "@/components/finance/transactions-calendar";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { decToNumber } from "@/lib/finance";
import { startOfBrisbaneDay, startOfWeek, startOfMonth, brisbaneDateKey } from "@/lib/date";

// Mirrors the Brisbane-day resolution already established in journal/page.tsx.
function dayRange(dateStr: string): { gte: Date; lt: Date } {
  const start = startOfBrisbaneDay(new Date(`${dateStr}T00:00:00Z`));
  const end = new Date(start.getTime() + 86_400_000);
  return { gte: start, lt: end };
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; from?: string; to?: string; month?: string }>;
}) {
  const params = await searchParams;
  const dbUser = await requireDbUser();

  const where: Prisma.TransactionWhereInput = { userId: dbUser.id };
  if (params.date) {
    where.date = dayRange(params.date);
  } else if (params.from || params.to) {
    where.date = {
      ...(params.from ? { gte: new Date(`${params.from}T00:00:00`) } : {}),
      ...(params.to ? { lt: new Date(new Date(`${params.to}T00:00:00`).getTime() + 86_400_000) } : {}),
    };
  }
  const hasFilters = Boolean(params.date || params.from || params.to);

  const [accountRows, transactionRows] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      // An explicit filter is a deliberate, usually-bounded range - only the
      // default unfiltered view (which could otherwise grow unbounded) is
      // capped at a "recent" preview.
      take: hasFilters ? 500 : 50,
    }),
  ]);
  const accounts = accountRows.map((a) => ({
    ...a,
    balance: decToNumber(a.balance),
    creditLimit: a.creditLimit != null ? decToNumber(a.creditLimit) : null,
  }));
  const transactions = transactionRows.map((t) => ({ ...t, amount: decToNumber(t.amount) }));
  const accountNames = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  const todayKey = brisbaneDateKey();
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const todayLocal = new Date(ty, tm - 1, td);
  const weekStartKey = ymd(startOfWeek(todayLocal));
  const monthStartKey = ymd(startOfMonth(todayLocal));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>Income and expenses across all accounts.</CardDescription>
            </div>
            <TransactionForm accounts={accounts} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TransactionsFilterBar todayKey={todayKey} weekStartKey={weekStartKey} monthStartKey={monthStartKey} params={params} />
            <TransactionsList
              transactions={transactions}
              accountNames={accountNames}
              showLimitNotice={!hasFilters && transactions.length >= 50}
            />
          </CardContent>
        </Card>

        <TransactionsCalendar userId={dbUser.id} monthParam={params.month} selectedDate={params.date} />
      </div>
    </div>
  );
}
