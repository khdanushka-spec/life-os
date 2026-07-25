"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import type { Transaction } from "@/generated/prisma/client";
import { deleteTransactionAction } from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, decToNumber } from "@/lib/finance";
import { cn } from "@/lib/utils";

const TYPE_ICON = { INCOME: ArrowUpCircle, EXPENSE: ArrowDownCircle, TRANSFER: ArrowLeftRight };

function TransactionRow({ txn, accountName }: { txn: Transaction; accountName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const Icon = TYPE_ICON[txn.type];
  const amount = decToNumber(txn.amount);

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <Icon
        className={cn(
          "size-5 shrink-0",
          txn.type === "INCOME" && "text-emerald-600 dark:text-emerald-400",
          txn.type === "EXPENSE" && "text-muted-foreground",
        )}
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{txn.description || txn.category}</p>
        <p className="text-[11px] text-muted-foreground">
          {accountName} · {txn.category} · {new Date(txn.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      </div>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          txn.type === "INCOME" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {txn.type === "INCOME" ? "+" : txn.type === "EXPENSE" ? "-" : ""}
        {formatCurrency(amount, txn.currency)}
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete transaction"
        onClick={() =>
          startTransition(async () => {
            await deleteTransactionAction(txn.id);
            router.refresh();
          })
        }
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function TransactionsList({
  transactions,
  accountNames,
}: {
  transactions: Transaction[];
  accountNames: Record<string, string>;
}) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No transactions yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((txn) => (
        <TransactionRow key={txn.id} txn={txn} accountName={accountNames[txn.accountId] ?? "Unknown"} />
      ))}
      {transactions.length >= 50 && (
        <Badge variant="secondary" className="mx-auto mt-2 w-fit">
          Showing most recent 50
        </Badge>
      )}
    </div>
  );
}
