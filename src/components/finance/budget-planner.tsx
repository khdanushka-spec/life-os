"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBudgetAction } from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

export type BudgetRow = { id: string; category: string; limit: number; spent: number };

function BudgetItem({ row }: { row: BudgetRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pct = row.limit > 0 ? Math.min(100, (row.spent / row.limit) * 100) : 0;
  const over = row.spent > row.limit;

  return (
    <div className={cn("flex flex-col gap-1.5 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{row.category}</p>
        <div className="flex items-center gap-2">
          <p className={cn("text-sm tabular-nums", over && "font-semibold text-destructive")}>
            {formatCurrency(row.spent)} <span className="text-muted-foreground">/ {formatCurrency(row.limit)}</span>
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete budget"
            onClick={() =>
              startTransition(async () => {
                await deleteBudgetAction(row.id);
                router.refresh();
              })
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width]", over ? "bg-destructive" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BudgetPlanner({ rows }: { rows: BudgetRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No budgets set for this month yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <BudgetItem key={row.id} row={row} />
      ))}
    </div>
  );
}
