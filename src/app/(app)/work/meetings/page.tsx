import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { splitMeetingsByTime } from "@/lib/work";
import { MeetingsHeader } from "@/components/work/meetings-header";
import { MeetingRow } from "@/components/work/meeting-row";

export default async function MeetingsPage() {
  const dbUser = await requireDbUser();

  const [meetings, projects, clients] = await Promise.all([
    prisma.meeting.findMany({
      where: { userId: dbUser.id },
      include: { project: true, client: true },
    }),
    prisma.project.findMany({ where: { userId: dbUser.id, kind: "WORK", archived: false }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { name: "asc" } }),
  ]);

  const { upcoming, past } = splitMeetingsByTime(meetings);
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name, company: c.company }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/work" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Work
      </Link>
      <MeetingsHeader projects={projectOptions} clients={clientOptions} />

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
          {upcoming.map((m) => (
            <MeetingRow
              key={m.id}
              meeting={m}
              completed={m.completed}
              projectName={m.project?.name ?? null}
              clientName={m.client?.name ?? null}
              projects={projectOptions}
              clients={clientOptions}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Past</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {past.length === 0 && <p className="text-sm text-muted-foreground">No past meetings.</p>}
          {past.map((m) => (
            <MeetingRow
              key={m.id}
              meeting={m}
              completed={m.completed}
              projectName={m.project?.name ?? null}
              clientName={m.client?.name ?? null}
              projects={projectOptions}
              clients={clientOptions}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
