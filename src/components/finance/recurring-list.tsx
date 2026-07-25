"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Zap } from "lucide-react";
import type { RecurringPayment } from "@/generated/prisma/client";
import { toggleRecurringActiveAction, deleteRecurringAction } from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, decToNumber } from "@/lib/finance";
import { cn } from "@/lib/utils";

const INTERVAL_LABELS: Record<string, string> = {
  WEEKLY: "week",
  FORTNIGHTLY: "2 weeks",
  MONTHLY: "month",
  QUARTERLY: "quarter",
  YEARLY: "year",
};

function RecurringRow({ item }: { item: RecurringPayment }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3", isPending && "opacity-60", !item.active && "opacity-50")}>
      <div className="flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {item.name}
          {item.autoPay && <Zap className="size-3 text-primary" />}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {item.category} · every {INTERVAL_LABELS[item.interval]} · next {new Date(item.nextDueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      </div>
      <p className={cn("text-sm font-semibold tabular-nums", item.type === "INCOME" && "text-emerald-600 dark:text-emerald-400")}>
        {item.type === "INCOME" ? "+" : "-"}
        {formatCurrency(decToNumber(item.amount), item.currency)}
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
  );
}

export function RecurringList({ items }: { items: RecurringPayment[] }) {
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
        <RecurringRow key={item.id} item={item} />
      ))}
    </div>
  );
}
