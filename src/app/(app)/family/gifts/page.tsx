import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { GiftsHeader } from "@/components/family/gifts-header";
import { GiftIdeaRow } from "@/components/family/gift-idea-row";
import type { GiftIdeaStatus } from "@/generated/prisma/client";

const STATUS_ORDER: Record<GiftIdeaStatus, number> = {
  IDEA: 0,
  PURCHASED: 1,
  GIVEN: 2,
};

export default async function GiftsPage() {
  const dbUser = await requireDbUser();

  const [giftIdeas, members] = await Promise.all([
    prisma.giftIdea.findMany({ where: { userId: dbUser.id }, include: { member: true }, orderBy: { updatedAt: "desc" } }),
    prisma.familyMember.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { name: "asc" } }),
  ]);
  const sorted = [...giftIdeas].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const memberOptions = members.map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/family" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Family
      </Link>
      <GiftsHeader members={memberOptions} />

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">All Gift Ideas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {sorted.length === 0 && <p className="text-sm text-muted-foreground">No gift ideas yet.</p>}
          {sorted.map((g) => (
            <GiftIdeaRow key={g.id} giftIdea={{ ...g, price: g.price ? Number(g.price) : null }} memberName={g.member.name} members={memberOptions} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
