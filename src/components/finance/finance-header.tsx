import { greeting } from "@/lib/greeting";
import { formatCurrency } from "@/lib/finance";

export function FinanceHeader({
  name,
  netWorth,
  netWorthChange,
}: {
  name: string;
  netWorth: number;
  netWorthChange: number | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card/60 p-6 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
      />
      <div className="relative flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span aria-hidden>💰</span> Finance
        </h1>
        <p className="text-sm text-muted-foreground">
          {greeting()}, {name}. Here&apos;s where things stand.
        </p>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-4xl font-semibold tabular-nums tracking-tight">{formatCurrency(netWorth)}</span>
          {netWorthChange != null && (
            <span
              className={`text-sm tabular-nums ${netWorthChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
            >
              {netWorthChange >= 0 ? "+" : ""}
              {formatCurrency(netWorthChange)} this month
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Net worth</p>
      </div>
    </div>
  );
}
