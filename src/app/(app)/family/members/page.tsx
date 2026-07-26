import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { MembersHeader } from "@/components/family/members-header";
import { MemberRow } from "@/components/family/member-row";

export default async function MembersPage() {
  const dbUser = await requireDbUser();

  const members = await prisma.familyMember.findMany({
    where: { userId: dbUser.id },
    orderBy: [{ archived: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/family" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Family
      </Link>
      <MembersHeader />
      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardContent className="flex flex-col gap-2 p-4">
          {members.length === 0 && (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No family members yet — add your first one above.
            </p>
          )}
          {members.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
