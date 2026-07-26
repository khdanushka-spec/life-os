import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { ClientsHeader } from "@/components/work/clients-header";
import { ClientRow } from "@/components/work/client-row";

export default async function ClientsPage() {
  const dbUser = await requireDbUser();

  const clients = await prisma.client.findMany({
    where: { userId: dbUser.id },
    orderBy: [{ archived: "asc" }, { name: "asc" }],
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/work" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Work
      </Link>
      <ClientsHeader />
      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardContent className="flex flex-col gap-2 p-4">
          {clients.length === 0 && (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No clients yet — add your first one above.
            </p>
          )}
          {clients.map((c) => (
            <ClientRow
              key={c.id}
              client={{ id: c.id, name: c.name, company: c.company, email: c.email, phone: c.phone, notes: c.notes, archived: c.archived }}
              projectCount={c._count.projects}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
