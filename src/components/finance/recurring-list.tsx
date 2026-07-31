"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Zap } from "lucide-react";
import type { RecurringPayment } from "@/generated/prisma/client";
import {
  toggleRecurringActiveAction,
  toggleRecurringAutoPayAction,
  setRecurringAccountAction,
  deleteRecurringAction,
} from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

// Money field converted to a plain number server-side - see AccountView
// in accounts-list.tsx for why.
export type RecurringView = Omit<RecurringPayment, "amount"> & { amount: number };

const INTERVAL_LABELS: Record<string, string> = {
  WEEKLY: "week",
  FORTNIGHTLY: "2 weeks",
  MONTHLY: "month",
  QUARTERLY: "quarter",
  YEARLY: "year",
};

function RecurringRow({ item, accounts }: { item: RecurringView; accounts: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border p-3", isPending && "opacity-60", !item.active && "opacity-50")}>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {item.name}
            <button
              type="button"
              aria-label={item.autoPay ? "Turn off auto-pay" : "Turn on auto-pay"}
              disabled={!item.accountId}
              title={item.accountId ? undefined : "Pick a nominated account first"}
              onClick={() =>
                startTransition(async () => {
                  await toggleRecurringAutoPayAction(item.id, !item.autoPay);
                  router.refresh();
                })
              }
              className="disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Zap className={cn("size-3", item.autoPay ? "text-primary" : "text-muted-foreground")} />
            </button>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {item.category} · every {INTERVAL_LABELS[item.interval]} · next {new Date(item.nextDueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
        <p className={cn("text-sm font-semibold tabular-nums", item.type === "INCOME" && "text-emerald-600 dark:text-emerald-400")}>
          {item.type === "INCOME" ? "+" : "-"}
          {formatCurrency(item.amount, item.currency)}
        </p>
        <Switch
          checked={item.active}
          onCheckedChange={(active) =>
            startTransition(async () => {
              await toggleRecurringActiveAction(item.id, active);
              router.refresh();
            })
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          onClick={() =>
            startTransition(async () => {
              await deleteRecurringAction(item.id);
              router.refresh();
            })
          }
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <Select
        value={item.accountId ?? "none"}
        onValueChange={(v) => {
          const accountId = v as string;
          startTransition(async () => {
            await setRecurringAccountAction(item.id, accountId === "none" ? null : accountId);
            router.refresh();
          });
        }}
      >
        <SelectTrigger className="h-7 w-full text-xs">
          <SelectValue placeholder="No nominated account" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No account (track only)</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RecurringList({ items, accounts }: { items: RecurringView[]; accounts: { id: string; name: string }[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No bills or subscriptions tracked yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <RecurringRow key={item.id} item={item} accounts={accounts} />
      ))}
    </div>
  );
}
