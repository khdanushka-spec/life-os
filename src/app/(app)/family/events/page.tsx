import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { splitEventsByTime } from "@/lib/family";
import { EventsHeader } from "@/components/family/events-header";
import { EventRow } from "@/components/family/event-row";

export default async function EventsPage() {
  const dbUser = await requireDbUser();

  const [events, members] = await Promise.all([
    prisma.familyEvent.findMany({ where: { userId: dbUser.id }, include: { member: true } }),
    prisma.familyMember.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { name: "asc" } }),
  ]);

  const { upcoming, past } = splitEventsByTime(events);
  const memberOptions = members.map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/family" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Family
      </Link>
      <EventsHeader members={memberOptions} />

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
          {upcoming.map((e) => (
            <EventRow key={e.id} event={e} memberName={e.member?.name ?? null} members={memberOptions} />
          ))}
        </CardContent>
      </Card>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Past</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {past.length === 0 && <p className="text-sm text-muted-foreground">No past events.</p>}
          {past.map((e) => (
            <EventRow key={e.id} event={e} memberName={e.member?.name ?? null} members={memberOptions} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
