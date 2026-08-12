import Link from "next/link";
import { Wallet, Landmark, TrendingUp } from "lucide-react";
import { greeting } from "@/lib/greeting";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

function BreakdownStat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className={cn("flex items-center gap-2", href && "-m-1 rounded-lg p-1 transition-colors hover:bg-foreground/5")}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-semibold tabular-nums leading-tight">{formatCurrency(value)}</p>
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}

export function FinanceHeader({
  name,
  netWorth,
  netWorthChange,
  cashOnHand,
  assets,
  loans,
}: {
  name: string;
  netWorth: number;
  netWorthChange: number | null;
  cashOnHand: number;
  assets: number;
  loans: number;
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

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-t pt-4">
          <BreakdownStat icon={Wallet} label="Cash in hand" value={cashOnHand} href="/finance/cash" />
          <BreakdownStat icon={TrendingUp} label="Assets" value={assets} />
          <BreakdownStat icon={Landmark} label="Loans" value={loans} href="/finance/loans" />
        </div>
      </div>
    </div>
  );
}
