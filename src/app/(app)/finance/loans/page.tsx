import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AccountsList } from "@/components/finance/accounts-list";
import { AssetLiabilityRow, type AssetLiabilityView } from "@/components/finance/investments-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { decToNumber, formatCurrency, LIABILITY_ACCOUNT_TYPES } from "@/lib/finance";
import { getAudFxSnapshot, convertToAud } from "@/lib/fx";

export default async function LoansPage() {
  const dbUser = await requireDbUser();

  const [accountRows, assetLiabilityRows, fx] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId: dbUser.id, archived: false, type: { in: LIABILITY_ACCOUNT_TYPES } },
      orderBy: { createdAt: "asc" },
    }),
    // Manual liabilities (e.g. a personal loan not modeled as an account) -
    // AssetLiability has no currency field, always AUD, same as
    // computeNetWorth treats it.
    prisma.assetLiability.findMany({
      where: { userId: dbUser.id, kind: "LIABILITY" },
      orderBy: { createdAt: "asc" },
    }),
    getAudFxSnapshot(),
  ]);

  const accounts = accountRows.map((a) => ({
    ...a,
    balance: decToNumber(a.balance),
    creditLimit: a.creditLimit != null ? decToNumber(a.creditLimit) : null,
  }));
  const manualLiabilities: AssetLiabilityView[] = assetLiabilityRows.map((a) => ({ ...a, value: decToNumber(a.value) }));

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
  for (const item of manualLiabilities) {
    totalAud += item.value;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Loans</CardTitle>
            <CardDescription>Every loan and credit card, plus any manually tracked liability.</CardDescription>
          </div>
          <Link href="/finance/accounts" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Manage accounts
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-2xl font-semibold tabular-nums text-destructive">
            {formatCurrency(totalAud)}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">total owed, converted</span>
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

      {manualLiabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other liabilities</CardTitle>
            <CardDescription>Manually tracked, from Investments &amp; Assets.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {manualLiabilities.map((item) => (
              <AssetLiabilityRow key={item.id} item={item} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
