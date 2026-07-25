import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MOODS, TAG_SUGGESTIONS } from "@/lib/journal";

export type JournalSearchParams = {
  q?: string;
  mood?: string;
  tag?: string;
  from?: string;
  to?: string;
};

function buildHref(params: JournalSearchParams, overrides: Partial<JournalSearchParams>) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `/journal?${query}` : "/journal";
}

export function JournalSearch({ params }: { params: JournalSearchParams }) {
  const hasFilters = params.q || params.mood || params.tag || params.from || params.to;

  return (
    <div className="flex flex-col gap-2">
      <form method="get" action="/journal" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search entries..." className="pl-7" />
        </div>
        <select
          name="mood"
          defaultValue={params.mood ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
        >
          <option value="">Any mood</option>
          {MOODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.emoji} {m.label}
            </option>
          ))}
        </select>
        <Input type="date" name="from" defaultValue={params.from ?? ""} className="w-36" />
        <Input type="date" name="to" defaultValue={params.to ?? ""} className="w-36" />
        {params.tag && <input type="hidden" name="tag" value={params.tag} />}
        <Button type="submit" size="sm" variant="outline">
          Search
        </Button>
        {hasFilters && (
          <Link href="/journal" className="text-xs text-muted-foreground hover:text-foreground">
            <X className="mr-1 inline size-3" />
            Clear
          </Link>
        )}
      </form>
      <div className="flex flex-wrap gap-1.5">
        {TAG_SUGGESTIONS.map((tag) => (
          <Link
            key={tag}
            href={buildHref(params, { tag: params.tag === tag ? undefined : tag })}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
              params.tag === tag
                ? "border-primary bg-primary/10 text-foreground"
                : "border-dashed text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
