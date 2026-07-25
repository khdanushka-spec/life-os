import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { fallbackPromptsForToday } from "@/lib/journal";
import { JournalComposer } from "@/components/journal/journal-composer";

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dbUser = await requireDbUser();

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId: dbUser.id },
  });
  if (!entry) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <Link href="/journal" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Journal
      </Link>
      <p className="text-xs text-muted-foreground">
        {new Date(entry.createdAt).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <div className="rounded-2xl border bg-card p-4 md:p-5">
        <JournalComposer initialEntry={entry} promptFallbacks={fallbackPromptsForToday()} />
      </div>
    </div>
  );
}
