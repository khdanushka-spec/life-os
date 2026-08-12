import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AccountsList } from "@/components/finance/accounts-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { decToNumber, formatCurrency, LIABILITY_ACCOUNT_TYPES } from "@/lib/finance";
import { getAudFxSnapshot, convertToAud } from "@/lib/fx";

export default async function CashInHandPage() {
  const dbUser = await requireDbUser();

  const [accountRows, fx] = await Promise.all([
    prisma.financialAccount.findMany({
      // Cash in hand is every non-liability account type (CHECKING/SAVINGS/
      // CASH), same set FinanceHeader's cashOnHand figure sums - across
      // every currency, not just AUD.
      where: { userId: dbUser.id, archived: false, type: { notIn: LIABILITY_ACCOUNT_TYPES } },
      orderBy: { createdAt: "asc" },
    }),
    getAudFxSnapshot(),
  ]);

  const accounts = accountRows.map((a) => ({
    ...a,
    balance: decToNumber(a.balance),
    creditLimit: a.creditLimit != null ? decToNumber(a.creditLimit) : null,
  }));

  let totalAud = 0;
  let unconverted = 0;
  for (const a of accounts) {
    const converted = convertToAud(a.balance, a.currency, fx?.rates);
    if (converted == null) {
      unconverted++;
      continue;
    }
    totalAud += converted;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Cash in Hand</CardTitle>
            <CardDescription>Every checking, savings, and cash account, in any currency.</CardDescription>
          </div>
          <Link href="/finance/accounts" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Manage accounts
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(totalAud)}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">total, converted</span>
          </p>
          {unconverted > 0 && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>
                Couldn&apos;t fetch today&apos;s exchange rate for one or more currencies, so {unconverted}{" "}
                {unconverted === 1 ? "account was" : "accounts were"} left out of this total.
              </AlertDescription>
            </Alert>
          )}
          <AccountsList accounts={accounts} />
        </CardContent>
      </Card>
    </div>
  );
}
