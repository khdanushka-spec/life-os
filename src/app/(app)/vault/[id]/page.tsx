import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { VaultComposer } from "@/components/vault/vault-composer";

export default async function VaultItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbUser = await requireDbUser();

  const item = await prisma.vaultItem.findFirst({ where: { id, userId: dbUser.id, type: "NOTE" } });
  if (!item) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <Link href="/vault" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Vault
      </Link>
      <p className="text-xs text-muted-foreground">
        Last edited{" "}
        {new Date(item.updatedAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </p>
      <div className="rounded-2xl border bg-card p-4 md:p-5">
        <VaultComposer
          initialItem={{ id: item.id, title: item.title, contentJson: item.contentJson, category: item.category, tags: item.tags }}
        />
      </div>
    </div>
  );
}
