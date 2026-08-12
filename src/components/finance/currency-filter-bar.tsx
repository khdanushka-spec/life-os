import Link from "next/link";
import { cn } from "@/lib/utils";

// Plain server-rendered Links (no client JS) driving a ?currency= param,
// same pattern as the transactions date-preset pills.
export function CurrencyFilterBar({
  basePath,
  currencies,
  active,
}: {
  basePath: string;
  currencies: string[];
  active?: string;
}) {
  if (currencies.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link
        href={basePath}
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs transition-colors",
          !active
            ? "border-primary bg-primary/10 text-foreground"
            : "border-dashed text-muted-foreground hover:border-primary hover:text-foreground",
        )}
      >
        All
      </Link>
      {currencies.map((code) => (
        <Link
          key={code}
          href={`${basePath}?currency=${code}`}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs transition-colors",
            active === code
              ? "border-primary bg-primary/10 text-foreground"
              : "border-dashed text-muted-foreground hover:border-primary hover:text-foreground",
          )}
        >
          {code}
        </Link>
      ))}
    </div>
  );
}
