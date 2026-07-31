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

const LKR = "LKR";

export default async function SriLankaAccountsPage() {
  const dbUser = await requireDbUser();

  const [accountRows, investmentRows, fx] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId: dbUser.id, archived: false, currency: LKR }, orderBy: { createdAt: "asc" } }),
    prisma.investment.findMany({ where: { userId: dbUser.id, currency: LKR }, orderBy: { createdAt: "asc" } }),
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

  const rate = fx?.rates[LKR] ?? null; // AUD value of 1 LKR

  let assetsAud = 0;
  let liabilitiesAud = 0;
  let unconverted = 0;
  for (const a of accounts) {
    const converted = convertToAud(a.balance, LKR, fx?.rates);
    if (converted == null) {
      unconverted++;
      continue;
    }
    if (LIABILITY_ACCOUNT_TYPES.includes(a.type)) liabilitiesAud += converted;
    else assetsAud += converted;
  }
  for (const inv of investments) {
    const converted = convertToAud(inv.currentValue, LKR, fx?.rates);
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
          <CardTitle>Sri Lankan Accounts</CardTitle>
          <CardDescription>
            Held in LKR, converted to AUD automatically and included in your overall net worth.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(netAud)}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">net, converted</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {rate != null ? `1 AUD = ${(1 / rate).toFixed(2)} LKR` : "Exchange rate unavailable right now"}
              {fx?.updatedAtUtc && <> · updated {new Date(fx.updatedAtUtc).toLocaleDateString("en-AU")}</>}
            </p>
          </div>
          {unconverted > 0 && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>
                Couldn&apos;t fetch today&apos;s exchange rate, so {unconverted} {unconverted === 1 ? "item was" : "items were"}{" "}
                left out of this total and your overall net worth — it&apos;ll catch up once the rate is back.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Accounts &amp; Loans</CardTitle>
            <CardDescription>Bank accounts and loans held in Sri Lanka.</CardDescription>
          </div>
          <AccountForm currency={LKR} />
        </CardHeader>
        <CardContent>
          <AccountsList accounts={accounts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Investments</CardTitle>
            <CardDescription>Shares, property, and other investments held in Sri Lanka.</CardDescription>
          </div>
          <InvestmentForm currency={LKR} />
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
