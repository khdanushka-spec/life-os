import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import { formatMeetingTime } from "@/lib/work";

export type UpcomingMeeting = {
  id: string;
  title: string;
  startTime: Date;
  projectName: string | null;
  clientName: string | null;
};

export function UpcomingMeetings({ meetings }: { meetings: UpcomingMeeting[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Upcoming Meetings</CardTitle>
        <Link href="/work/meetings" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {meetings.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
        {meetings.map((m) => (
          <div key={m.id} className="flex items-start gap-2 text-sm">
            <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium">{m.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatMeetingTime(m.startTime)}
                {m.projectName ? ` · ${m.projectName}` : m.clientName ? ` · ${m.clientName}` : ""}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
