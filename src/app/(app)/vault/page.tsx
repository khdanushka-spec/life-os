import Link from "next/link";
import { Prisma, type VaultItemType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { buttonVariants } from "@/components/ui/button";
import { getOrGenerateDailyInsight } from "@/lib/ai/vault";
import { VaultHeader } from "@/components/vault/vault-header";
import { VaultStatsRow } from "@/components/vault/vault-stats-row";
import { VaultInsightCard } from "@/components/vault/vault-insight-card";
import { VaultSearch, type VaultSearchParams } from "@/components/vault/vault-search";
import { VaultItemRow } from "@/components/vault/vault-item-row";

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; category?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const dbUser = await requireDbUser();

  const where: Prisma.VaultItemWhereInput = { userId: dbUser.id };
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { contentText: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.type) where.type = params.type as VaultItemType;
  if (params.category) where.category = params.category;
  if (params.tag) where.tags = { has: params.tag };
  const hasFilters = Boolean(params.q || params.type || params.category || params.tag);

  const [items, totalItems, notesCount, linksCount, uncategorizedCount, allTagRows, dailyInsight] = await Promise.all([
    prisma.vaultItem.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.vaultItem.count({ where: { userId: dbUser.id } }),
    prisma.vaultItem.count({ where: { userId: dbUser.id, type: "NOTE" } }),
    prisma.vaultItem.count({ where: { userId: dbUser.id, type: "LINK" } }),
    prisma.vaultItem.count({ where: { userId: dbUser.id, category: null } }),
    prisma.vaultItem.findMany({ where: { userId: dbUser.id }, select: { tags: true } }),
    getOrGenerateDailyInsight(dbUser.id),
  ]);

  const availableTags = [...new Set(allTagRows.flatMap((r) => r.tags))].sort().slice(0, 20);
  const searchParamsForFilters: VaultSearchParams = params;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
      <VaultHeader />

      <div className="flex flex-wrap gap-2">
        <Link href="/vault/reports" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Reports
        </Link>
      </div>

      <VaultStatsRow totalItems={totalItems} notes={notesCount} links={linksCount} uncategorized={uncategorizedCount} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <VaultSearch params={searchParamsForFilters} availableTags={availableTags} />
          {hasFilters && (
            <p className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "result" : "results"}
            </p>
          )}
          <div className="flex flex-col gap-2">
            {items.length === 0 && (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {hasFilters ? "No items match those filters." : "Nothing saved yet — add your first note or link above."}
              </p>
            )}
            {items.map((item) => (
              <VaultItemRow
                key={item.id}
                item={{
                  id: item.id,
                  type: item.type,
                  title: item.title,
                  contentText: item.contentText,
                  url: item.url,
                  category: item.category,
                  tags: item.tags,
                  favorited: item.favorited,
                  updatedAt: item.updatedAt,
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <VaultInsightCard insight={dailyInsight} />
        </div>
      </div>
    </div>
  );
}
