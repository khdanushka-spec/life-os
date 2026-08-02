"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import type { Transaction } from "@/generated/prisma/client";
import { deleteTransactionAction } from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

// Money fields converted to plain numbers server-side - see AccountView
// in accounts-list.tsx for why (Prisma Decimal doesn't survive the
// server->client boundary as a real Decimal instance).
export type TransactionView = Omit<Transaction, "amount"> & { amount: number };

const TYPE_ICON = { INCOME: ArrowUpCircle, EXPENSE: ArrowDownCircle, TRANSFER: ArrowLeftRight };

function TransactionRow({ txn, accountName }: { txn: TransactionView; accountName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const Icon = TYPE_ICON[txn.type];
  // TRANSFER rows store a signed amount (negative = left this account,
  // positive = arrived) so balance reversal on delete is simple - every
  // other type stores a plain positive magnitude with sign implied by type.
  const isIncoming = txn.type === "INCOME" || (txn.type === "TRANSFER" && txn.amount >= 0);
  const magnitude = txn.type === "TRANSFER" ? Math.abs(txn.amount) : txn.amount;

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <Icon
        className={cn(
          "size-5 shrink-0",
          isIncoming && "text-emerald-600 dark:text-emerald-400",
          txn.type === "EXPENSE" && "text-muted-foreground",
        )}
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{txn.description || txn.category}</p>
        <p className="text-[11px] text-muted-foreground">
          {accountName} · {txn.category} · {new Date(txn.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      </div>
      <p className={cn("text-sm font-semibold tabular-nums", isIncoming && "text-emerald-600 dark:text-emerald-400")}>
        {isIncoming ? "+" : "-"}
        {formatCurrency(magnitude, txn.currency)}
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
  showLimitNotice = false,
}: {
  transactions: TransactionView[];
  accountNames: Record<string, string>;
  // True only for the unfiltered, capped-at-50 view - a filtered range
  // that happens to also have 50 results is a complete list, not a cap.
  showLimitNotice?: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No transactions yet.
      </p>
    );
  }

  // Transfers are stored with a signed amount (see TransactionRow), so a
  // matched pair nets to zero here automatically - grouped by currency
  // rather than summed blind, per the cross-currency bug already found
  // in net-worth totals (see HANDOVER.md).
  const totals: Record<string, number> = {};
  for (const txn of transactions) {
    const signed = txn.type === "EXPENSE" ? -txn.amount : txn.amount;
    totals[txn.currency] = (totals[txn.currency] ?? 0) + signed;
  }
  const currencies = Object.keys(totals);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between border-b pb-2 text-sm">
        <span className="font-medium text-muted-foreground">
          {showLimitNotice ? "Total (most recent 50)" : "Total"}
        </span>
        <span className="flex gap-3 font-semibold tabular-nums">
          {currencies.map((c) => (
            <span key={c} className={cn(totals[c] >= 0 && "text-emerald-600 dark:text-emerald-400")}>
              {totals[c] >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(totals[c]), c)}
            </span>
          ))}
        </span>
      </div>
      {transactions.map((txn) => (
        <TransactionRow key={txn.id} txn={txn} accountName={accountNames[txn.accountId] ?? "Unknown"} />
      ))}
      {showLimitNotice && (
        <Badge variant="secondary" className="mx-auto mt-2 w-fit">
          Showing most recent 50
        </Badge>
      )}
    </div>
  );
}
