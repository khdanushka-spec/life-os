import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportStatementClient } from "@/components/finance/import-statement-client";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

export default async function ImportStatementPage() {
  const dbUser = await requireDbUser();
  const accountRows = await prisma.financialAccount.findMany({
    where: { userId: dbUser.id, archived: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, currency: true },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link
        href="/finance/transactions"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to Transactions
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Import bank statement</CardTitle>
          <CardDescription>
            Upload a CSV or PDF statement from your bank. It checks what&apos;s already recorded, flags bank-to-bank
            transfers and loan payments against your other accounts, and only adds what you confirm. CSV is far more
            reliable — PDF text extraction is best-effort and flags anything it&apos;s not confident about for you to
            check.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accountRows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Add an account first before importing a statement.
            </p>
          ) : (
            <ImportStatementClient accounts={accountRows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
