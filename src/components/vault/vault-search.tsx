import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VAULT_CATEGORY_PRESETS } from "@/lib/vault";

export type VaultSearchParams = {
  q?: string;
  type?: string;
  category?: string;
  tag?: string;
};

function buildHref(params: VaultSearchParams, overrides: Partial<VaultSearchParams>) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `/vault?${query}` : "/vault";
}

export function VaultSearch({ params, availableTags }: { params: VaultSearchParams; availableTags: string[] }) {
  const hasFilters = params.q || params.type || params.category || params.tag;

  return (
    <div className="flex flex-col gap-2">
      <form method="get" action="/vault" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search notes and links..." className="pl-7" />
        </div>
        <select
          name="type"
          defaultValue={params.type ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
        >
          <option value="">Any type</option>
          <option value="NOTE">Notes</option>
          <option value="LINK">Links</option>
        </select>
        <select
          name="category"
          defaultValue={params.category ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
        >
          <option value="">Any category</option>
          {VAULT_CATEGORY_PRESETS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {params.tag && <input type="hidden" name="tag" value={params.tag} />}
        <Button type="submit" size="sm" variant="outline">
          Search
        </Button>
        {hasFilters && (
          <Link href="/vault" className="text-xs text-muted-foreground hover:text-foreground">
            <X className="mr-1 inline size-3" />
            Clear
          </Link>
        )}
      </form>
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableTags.map((tag) => (
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
      )}
    </div>
  );
}
