import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { BooksHeader } from "@/components/learning/books-header";
import { BookRow } from "@/components/learning/book-row";
import type { BookStatus } from "@/generated/prisma/client";

const STATUS_ORDER: Record<BookStatus, number> = {
  READING: 0,
  WANT_TO_READ: 1,
  FINISHED: 2,
  ABANDONED: 3,
};

export default async function BooksPage() {
  const dbUser = await requireDbUser();

  const books = await prisma.book.findMany({
    where: { userId: dbUser.id },
    orderBy: { updatedAt: "desc" },
  });
  const sorted = [...books].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/learning" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Learning
      </Link>
      <BooksHeader />

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">All Books</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {sorted.length === 0 && <p className="text-sm text-muted-foreground">No books added yet.</p>}
          {sorted.map((b) => (
            <BookRow key={b.id} book={b} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
