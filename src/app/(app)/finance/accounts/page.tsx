import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/components/finance/account-form";
import { AccountsList } from "@/components/finance/accounts-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

export default async function AccountsPage() {
  const dbUser = await requireDbUser();
  const accounts = await prisma.financialAccount.findMany({
    where: { userId: dbUser.id, archived: false },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Bank accounts, cash, cards, and loans.</CardDescription>
          </div>
          <AccountForm />
        </CardHeader>
        <CardContent>
          <AccountsList accounts={accounts} />
        </CardContent>
      </Card>
    </div>
  );
}
