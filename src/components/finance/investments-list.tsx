"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Investment, AssetLiability } from "@/generated/prisma/client";
import { updateInvestmentValueAction, deleteInvestmentAction, deleteAssetLiabilityAction } from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, INVESTMENT_TYPE_LABELS } from "@/lib/finance";
import { cn } from "@/lib/utils";

// Money fields converted to plain numbers server-side - see AccountView
// in accounts-list.tsx for why.
export type InvestmentView = Omit<Investment, "units" | "costBasis" | "currentValue"> & {
  units: number | null;
  costBasis: number;
  currentValue: number;
};
export type AssetLiabilityView = Omit<AssetLiability, "value"> & { value: number };

export function InvestmentRow({ investment }: { investment: InvestmentView }) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(investment.currentValue.toString());
  const router = useRouter();
  const gain = investment.currentValue - investment.costBasis;

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border p-3.5", isPending && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{investment.name}</p>
          <Badge variant="secondary" className="mt-0.5 text-[10px]">
            {INVESTMENT_TYPE_LABELS[investment.type]}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(investment.currentValue, investment.currency)}</p>
          <p className={cn("text-[11px] tabular-nums", gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
            {gain >= 0 ? "+" : ""}
            {formatCurrency(gain, investment.currency)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} className="h-7" />
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            startTransition(async () => {
              const val = Number(value);
              if (Number.isFinite(val)) {
                await updateInvestmentValueAction(investment.id, val);
                router.refresh();
              }
            })
          }
        >
          Update value
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete investment"
          onClick={() =>
            startTransition(async () => {
              await deleteInvestmentAction(investment.id);
              router.refresh();
            })
          }
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function AssetLiabilityRow({ item }: { item: AssetLiabilityView }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3", isPending && "opacity-60")}>
      <div className="flex-1">
        <p className="text-sm font-medium">{item.name}</p>
        <p className="text-[11px] text-muted-foreground">{item.category}</p>
      </div>
      <p className={cn("text-sm font-semibold tabular-nums", item.kind === "LIABILITY" && "text-destructive")}>
        {item.kind === "LIABILITY" && "-"}
        {formatCurrency(item.value)}
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete"
        onClick={() =>
          startTransition(async () => {
            await deleteAssetLiabilityAction(item.id);
            router.refresh();
          })
        }
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function InvestmentsList({
  investments,
  assetsLiabilities,
}: {
  investments: InvestmentView[];
  assetsLiabilities: AssetLiabilityView[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Investments</p>
        {investments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No investments yet.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {investments.map((inv) => (
              <InvestmentRow key={inv.id} investment={inv} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Other assets & liabilities</p>
        {assetsLiabilities.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing added yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {assetsLiabilities.map((item) => (
              <AssetLiabilityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
