import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { DocumentsHeader } from "@/components/family/documents-header";
import { DocumentRow } from "@/components/family/document-row";

export default async function DocumentsPage() {
  const dbUser = await requireDbUser();

  const [documents, members] = await Promise.all([
    prisma.familyDocument.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: { member: true },
    }),
    prisma.familyMember.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { name: "asc" } }),
  ]);

  const memberOptions = members.map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/family" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Family
      </Link>
      <DocumentsHeader members={memberOptions} />

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardContent className="flex flex-col gap-2 p-4">
          {documents.length === 0 && (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No documents yet — add your first one above.
            </p>
          )}
          {documents.map((d) => (
            <DocumentRow
              key={d.id}
              document={{ id: d.id, title: d.title, description: d.description, url: d.url, memberId: d.memberId, tags: d.tags }}
              memberName={d.member?.name ?? null}
              members={memberOptions}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
