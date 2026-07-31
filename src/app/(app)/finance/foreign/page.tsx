import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AccountForm } from "@/components/finance/account-form";
import { AccountsList } from "@/components/finance/accounts-list";
import { InvestmentForm } from "@/components/finance/investment-form";
import { InvestmentRow } from "@/components/finance/investments-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { decToNumber, formatCurrency, LIABILITY_ACCOUNT_TYPES } from "@/lib/finance";
import { getAudFxSnapshot, convertToAud } from "@/lib/fx";

export default async function ForeignAccountsPage() {
  const dbUser = await requireDbUser();

  const [accountRows, investmentRows, fx] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId: dbUser.id, archived: false, currency: { not: "AUD" } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.investment.findMany({
      where: { userId: dbUser.id, currency: { not: "AUD" } },
      orderBy: { createdAt: "asc" },
    }),
    getAudFxSnapshot(),
  ]);

  const accounts = accountRows.map((a) => ({
    ...a,
    balance: decToNumber(a.balance),
    creditLimit: a.creditLimit != null ? decToNumber(a.creditLimit) : null,
  }));
  const investments = investmentRows.map((i) => ({
    ...i,
    units: i.units != null ? decToNumber(i.units) : null,
    costBasis: decToNumber(i.costBasis),
    currentValue: decToNumber(i.currentValue),
  }));

  const currenciesPresent = Array.from(
    new Set([...accounts.map((a) => a.currency), ...investments.map((i) => i.currency)]),
  ).sort();

  let assetsAud = 0;
  let liabilitiesAud = 0;
  let unconverted = 0;
  for (const a of accounts) {
    const converted = convertToAud(a.balance, a.currency, fx?.rates);
    if (converted == null) {
      unconverted++;
      continue;
    }
    if (LIABILITY_ACCOUNT_TYPES.includes(a.type)) liabilitiesAud += converted;
    else assetsAud += converted;
  }
  for (const inv of investments) {
    const converted = convertToAud(inv.currentValue, inv.currency, fx?.rates);
    if (converted == null) {
      unconverted++;
      continue;
    }
    assetsAud += converted;
  }
  const netAud = assetsAud - liabilitiesAud;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Foreign Accounts</CardTitle>
          <CardDescription>
            Accounts, loans, and investments held in any currency other than AUD, converted automatically and
            included in your overall net worth.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(netAud)}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">net, converted</span>
            </p>
            {currenciesPresent.length > 0 && (
              <div className="text-right text-xs text-muted-foreground">
                {currenciesPresent.map((code) => {
                  const rate = fx?.rates[code];
                  return (
                    <p key={code}>{rate != null ? `1 AUD = ${(1 / rate).toFixed(2)} ${code}` : `${code} rate unavailable`}</p>
                  );
                })}
                {fx?.updatedAtUtc && <p>updated {new Date(fx.updatedAtUtc).toLocaleDateString("en-AU")}</p>}
              </div>
            )}
          </div>
          {unconverted > 0 && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>
                Couldn&apos;t fetch today&apos;s exchange rate for one or more currencies, so {unconverted}{" "}
                {unconverted === 1 ? "item was" : "items were"} left out of this total and your overall net worth —
                it&apos;ll catch up once the rate is back.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Accounts &amp; Loans</CardTitle>
            <CardDescription>Bank accounts and loans held outside Australia.</CardDescription>
          </div>
          <AccountForm currencyPicker />
        </CardHeader>
        <CardContent>
          <AccountsList accounts={accounts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Investments</CardTitle>
            <CardDescription>Shares, property, and other investments held outside Australia.</CardDescription>
          </div>
          <InvestmentForm currencyPicker />
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No investments yet.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {investments.map((inv) => (
                <InvestmentRow key={inv.id} investment={inv} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
