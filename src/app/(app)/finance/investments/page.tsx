import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestmentForm } from "@/components/finance/investment-form";
import { AssetLiabilityForm } from "@/components/finance/asset-liability-form";
import { InvestmentsList } from "@/components/finance/investments-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

export default async function InvestmentsPage() {
  const dbUser = await requireDbUser();
  const [investments, assetsLiabilities] = await Promise.all([
    prisma.investment.findMany({ where: { userId: dbUser.id }, orderBy: { createdAt: "asc" } }),
    prisma.assetLiability.findMany({ where: { userId: dbUser.id }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Investments & Assets</CardTitle>
            <CardDescription>Shares, ETFs, crypto, property, super, and everything else you own or owe. Values are updated manually for now.</CardDescription>
          </div>
          <div className="flex gap-2">
            <InvestmentForm />
            <AssetLiabilityForm />
          </div>
        </CardHeader>
        <CardContent>
          <InvestmentsList investments={investments} assetsLiabilities={assetsLiabilities} />
        </CardContent>
      </Card>
    </div>
  );
}
