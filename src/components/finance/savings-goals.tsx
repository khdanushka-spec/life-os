"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ShieldCheck } from "lucide-react";
import type { SavingsGoal } from "@/generated/prisma/client";
import { updateGoalProgressAction, deleteGoalAction } from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, decToNumber } from "@/lib/finance";
import { cn } from "@/lib/utils";

function GoalCard({ goal }: { goal: SavingsGoal }) {
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(decToNumber(goal.currentAmount).toString());
  const router = useRouter();
  const target = decToNumber(goal.targetAmount);
  const current = decToNumber(goal.currentAmount);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border p-3.5", isPending && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {goal.name}
          {goal.isEmergencyFund && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <ShieldCheck className="size-3" /> Emergency fund
            </Badge>
          )}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete goal"
          onClick={() =>
            startTransition(async () => {
              await deleteGoalAction(goal.id);
              router.refresh();
            })
          }
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {formatCurrency(current)} of {formatCurrency(target)} ({Math.round(pct)}%)
        </span>
        {goal.targetDate && <span>by {new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-7"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            startTransition(async () => {
              const val = Number(amount);
              if (Number.isFinite(val)) {
                await updateGoalProgressAction(goal.id, val);
                router.refresh();
              }
            })
          }
        >
          Update
        </Button>
      </div>
    </div>
  );
}

export function SavingsGoals({ goals }: { goals: SavingsGoal[] }) {
  if (goals.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No savings goals yet — add your emergency fund or a big purchase target above.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
}
