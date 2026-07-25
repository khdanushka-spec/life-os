import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewEntryForm } from "@/components/journal/new-entry-form";
import { EntryList } from "@/components/journal/entry-list";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";

export default async function JournalPage() {
  const dbUser = await requireDbUser();
  const entries = await prisma.journalEntry.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Journal</CardTitle>
          <CardDescription>
            A place to reflect — mood, gratitude, whatever&apos;s on your mind.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <NewEntryForm />
          <EntryList entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
