import Link from "next/link";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TransactionsFilterParams = { date?: string; from?: string; to?: string };

export function TransactionsFilterBar({
  todayKey,
  weekStartKey,
  monthStartKey,
  params,
}: {
  todayKey: string;
  weekStartKey: string;
  monthStartKey: string;
  params: TransactionsFilterParams;
}) {
  const hasFilters = Boolean(params.date || params.from || params.to);
  const presets = [
    { label: "Today", href: `/finance/transactions?date=${todayKey}`, active: params.date === todayKey },
    {
      label: "This week",
      href: `/finance/transactions?from=${weekStartKey}&to=${todayKey}`,
      active: params.from === weekStartKey && params.to === todayKey,
    },
    {
      label: "This month",
      href: `/finance/transactions?from=${monthStartKey}&to=${todayKey}`,
      active: params.from === monthStartKey && params.to === todayKey,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {presets.map((p) => (
        <Link
          key={p.label}
          href={p.href}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs transition-colors",
            p.active
              ? "border-primary bg-primary/10 text-foreground"
              : "border-dashed text-muted-foreground hover:border-primary hover:text-foreground",
          )}
        >
          {p.label}
        </Link>
      ))}
      <form method="get" action="/finance/transactions" className="flex items-center gap-1.5">
        <Input type="date" name="from" defaultValue={params.from ?? ""} className="h-7 w-[8.75rem] text-xs" />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" name="to" defaultValue={params.to ?? ""} className="h-7 w-[8.75rem] text-xs" />
        <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
          Apply
        </Button>
      </form>
      {hasFilters && (
        <Link href="/finance/transactions" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <X className="size-3" /> Clear
        </Link>
      )}
    </div>
  );
}
