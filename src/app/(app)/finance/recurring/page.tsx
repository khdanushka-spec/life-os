import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecurringForm } from "@/components/finance/recurring-form";
import { RecurringList } from "@/components/finance/recurring-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { decToNumber } from "@/lib/finance";
import { processDueRecurringPayments } from "@/server/recurring-automation";

export default async function RecurringPage() {
  const dbUser = await requireDbUser();
  // Lazily catches up any autoPay bills that came due since the last visit
  // - see processDueRecurringPayments for why this is a page-load check
  // rather than a true cron.
  await processDueRecurringPayments(dbUser.id);

  const [rows, accountRows] = await Promise.all([
    prisma.recurringPayment.findMany({ where: { userId: dbUser.id }, orderBy: { nextDueDate: "asc" } }),
    // Recurring payments are only ever created in AUD (see recurringSchema)
    // - restricting the nominated-account picker to AUD accounts avoids a
    // $460 AUD rent payment silently debiting a foreign-currency balance
    // by 460 units of the wrong currency.
    prisma.financialAccount.findMany({ where: { userId: dbUser.id, archived: false, currency: "AUD" }, orderBy: { name: "asc" } }),
  ]);
  const items = rows.map((r) => ({ ...r, amount: decToNumber(r.amount) }));
  const accounts = accountRows.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Bills & Subscriptions</CardTitle>
            <CardDescription>
              Recurring payments and income. Turn on auto-pay with a nominated account to have these post
              automatically on their due date.
            </CardDescription>
          </div>
          <RecurringForm accounts={accounts} />
        </CardHeader>
        <CardContent>
          <RecurringList items={items} accounts={accounts} />
        </CardContent>
      </Card>
    </div>
  );
}
