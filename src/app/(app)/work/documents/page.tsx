import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { DocumentsHeader } from "@/components/work/documents-header";
import { DocumentRow } from "@/components/work/document-row";

export default async function DocumentsPage() {
  const dbUser = await requireDbUser();

  const [documents, projects, clients] = await Promise.all([
    prisma.workDocument.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: { project: true, client: true },
    }),
    prisma.project.findMany({ where: { userId: dbUser.id, kind: "WORK", archived: false }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { name: "asc" } }),
  ]);

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name, company: c.company }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/work" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Work
      </Link>
      <DocumentsHeader projects={projectOptions} clients={clientOptions} />

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
              document={{ id: d.id, title: d.title, description: d.description, url: d.url, projectId: d.projectId, clientId: d.clientId, tags: d.tags }}
              projectName={d.project?.name ?? null}
              clientName={d.client?.name ?? null}
              projects={projectOptions}
              clients={clientOptions}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
