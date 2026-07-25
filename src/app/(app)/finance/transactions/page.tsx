import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionsList } from "@/components/finance/transactions-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

export default async function TransactionsPage() {
  const dbUser = await requireDbUser();
  const [accounts, transactions] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({
      where: { userId: dbUser.id },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);
  const accountNames = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Income and expenses across all accounts.</CardDescription>
          </div>
          <TransactionForm accounts={accounts} />
        </CardHeader>
        <CardContent>
          <TransactionsList transactions={transactions} accountNames={accountNames} />
        </CardContent>
      </Card>
    </div>
  );
}
