"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import type { FinancialAccount } from "@/generated/prisma/client";
import { archiveAccountAction } from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, LIABILITY_ACCOUNT_TYPES, formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

// Prisma's Decimal doesn't survive the server->client boundary as a real
// Decimal instance (it arrives without a working .toNumber()), so money
// fields are converted to plain numbers server-side before this
// component ever sees them - see each finance page.tsx.
export type AccountView = Omit<FinancialAccount, "balance" | "creditLimit"> & {
  balance: number;
  creditLimit: number | null;
};

function AccountRow({ account }: { account: AccountView }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const Icon = ACCOUNT_TYPE_ICONS[account.type];
  const isLiability = LIABILITY_ACCOUNT_TYPES.includes(account.type);
  const balance = account.balance;

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3.5", isPending && "opacity-60")}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{account.name}</p>
        <Badge variant="secondary" className="mt-0.5 text-[10px]">
          {ACCOUNT_TYPE_LABELS[account.type]}
        </Badge>
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-semibold tabular-nums", isLiability && "text-destructive")}>
          {isLiability && "-"}
          {formatCurrency(balance, account.currency)}
        </p>
        {account.type === "CREDIT_CARD" && account.creditLimit != null && (
          <p className="text-[11px] text-muted-foreground">
            of {formatCurrency(account.creditLimit, account.currency)} limit
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Archive account"
        onClick={() =>
          startTransition(async () => {
            await archiveAccountAction(account.id);
            router.refresh();
          })
        }
      >
        <Archive className="size-3.5" />
      </Button>
    </div>
  );
}

export function AccountsList({ accounts }: { accounts: AccountView[] }) {
  if (accounts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No accounts yet — add your first bank account, card, or wallet above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {accounts.map((account) => (
        <AccountRow key={account.id} account={account} />
      ))}
    </div>
  );
}
