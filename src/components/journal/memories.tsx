import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { moodMeta } from "@/lib/journal";
import type { JournalEntry } from "@/generated/prisma/client";

function dayRange(date: Date): { gte: Date; lt: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

async function findOnDate(userId: string, date: Date): Promise<JournalEntry | null> {
  return prisma.journalEntry.findFirst({
    where: { userId, createdAt: dayRange(date) },
    orderBy: { createdAt: "desc" },
  });
}

function pickRandomId(candidates: { id: string }[]): string {
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

async function findRandomEntry(candidates: { id: string }[]): Promise<JournalEntry | null> {
  if (candidates.length === 0) return null;
  return prisma.journalEntry.findUnique({ where: { id: pickRandomId(candidates) } });
}

function MemoryRow({ label, entry }: { label: string; entry: JournalEntry }) {
  const mood = moodMeta(entry.mood);
  const preview =
    entry.contentText.length > 140 ? `${entry.contentText.slice(0, 140)}...` : entry.contentText;
  return (
    <Link
      href={`/journal/${entry.id}`}
      className="flex flex-col gap-1 rounded-lg border border-dashed p-2.5 transition-colors hover:border-primary"
    >
      <p className="text-[11px] font-medium text-muted-foreground">
        {label} {mood && <>· {mood.emoji}</>}
      </p>
      <p className="text-xs text-muted-foreground">{preview || "(empty entry)"}</p>
    </Link>
  );
}

export async function Memories({ userId }: { userId: string }) {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const [yearAgo, sixMonths, randomCandidate] = await Promise.all([
    findOnDate(userId, oneYearAgo),
    findOnDate(userId, sixMonthsAgo),
    prisma.journalEntry.findMany({
      where: { userId, createdAt: { lt: dayRange(now).gte } },
      select: { id: true },
    }),
  ]);

  const random = await findRandomEntry(randomCandidate);

  const hasAny = yearAgo || sixMonths || random;
  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-primary" /> Memories
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {yearAgo && <MemoryRow label="One year ago" entry={yearAgo} />}
        {sixMonths && <MemoryRow label="Six months ago" entry={sixMonths} />}
        {random && random.id !== yearAgo?.id && random.id !== sixMonths?.id && (
          <MemoryRow label="From your journal" entry={random} />
        )}
      </CardContent>
    </Card>
  );
}
