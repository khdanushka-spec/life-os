import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

export type CategorySpend = { category: string; amount: number };

// Dataviz-skill validated 8-slot categorical palette, assigned by rank.
// Capped at 7 explicit categories + "Other" (slot 8 reserved, muted) -
// never a generated 9th hue, per the skill's categorical rule. Classes
// are literal strings (not built from JS variables) so Tailwind's
// static scanner actually generates them - light-dark() was tried here
// first but doesn't follow this app's class-based .dark toggle, only OS
// preference, so it's dropped in favor of explicit dark: variants.
const SLOT_DOT_CLASSES = [
  "bg-[#2a78d6] dark:bg-[#3987e5]",
  "bg-[#eb6834] dark:bg-[#d95926]",
  "bg-[#1baf7a] dark:bg-[#199e70]",
  "bg-[#eda100] dark:bg-[#c98500]",
  "bg-[#e87ba4] dark:bg-[#d55181]",
  "bg-[#008300] dark:bg-[#008300]",
  "bg-[#4a3aa7] dark:bg-[#9085e9]",
];
const OTHER_DOT_CLASS = "bg-[#898781]";

export function SpendingAnalytics({ data }: { data: CategorySpend[] }) {
  const sorted = [...data].filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount);
  if (sorted.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No spending recorded yet this month.
      </p>
    );
  }

  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const otherTotal = rest.reduce((sum, r) => sum + r.amount, 0);
  const rows = otherTotal > 0 ? [...top, { category: "Other", amount: otherTotal }] : top;
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, i) => {
        const dotClass = i < top.length ? SLOT_DOT_CLASSES[i] : OTHER_DOT_CLASS;
        const pct = (row.amount / total) * 100;
        return (
          <div key={row.category} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5">
                <span className={cn("inline-block size-2.5 rounded-full", dotClass)} />
                {row.category}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatCurrency(row.amount)} ({Math.round(pct)}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", dotClass)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
