import { formatCurrency } from "@/lib/finance";

export type MonthlyTotals = { month: string; budgeted: number; actual: number };

// Two-series grouped bar chart (Budgeted vs Actual per month), colors are
// slots 1+2 of the dataviz-skill validated categorical palette - already
// documented as clearing all-pairs CVD separation in both light and dark.
// Light/dark steps are separate validated values, not one color flipped.
export function BudgetYearlyChart({ data }: { data: MonthlyTotals[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.budgeted, d.actual]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" />
          Budgeted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[#eb6834] dark:bg-[#d95926]" />
          Actual
        </span>
      </div>
      <div className="flex h-35 items-end gap-2 overflow-x-auto">
        {data.map((d) => (
          <div key={d.month} className="flex min-w-10 flex-1 flex-col items-center gap-1">
            <div className="flex h-full items-end gap-0.5">
              <div
                className="w-2.5 rounded-t-sm bg-[#2a78d6] dark:bg-[#3987e5]"
                style={{ height: `${(d.budgeted / max) * 100}%` }}
                title={`${d.month} budgeted: ${formatCurrency(d.budgeted)}`}
              />
              <div
                className="w-2.5 rounded-t-sm bg-[#eb6834] dark:bg-[#d95926]"
                style={{ height: `${(d.actual / max) * 100}%` }}
                title={`${d.month} actual: ${formatCurrency(d.actual)}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
