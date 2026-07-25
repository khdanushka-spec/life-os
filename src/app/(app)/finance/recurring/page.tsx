import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecurringForm } from "@/components/finance/recurring-form";
import { RecurringList } from "@/components/finance/recurring-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { decToNumber } from "@/lib/finance";

export default async function RecurringPage() {
  const dbUser = await requireDbUser();
  const rows = await prisma.recurringPayment.findMany({
    where: { userId: dbUser.id },
    orderBy: { nextDueDate: "asc" },
  });
  const items = rows.map((r) => ({ ...r, amount: decToNumber(r.amount) }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Link href="/finance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Finance
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Bills & Subscriptions</CardTitle>
            <CardDescription>Recurring payments and income.</CardDescription>
          </div>
          <RecurringForm />
        </CardHeader>
        <CardContent>
          <RecurringList items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
