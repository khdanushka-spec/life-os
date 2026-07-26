import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import { FAMILY_EVENT_TYPE_META } from "@/lib/family";
import type { FamilyEventType } from "@/generated/prisma/client";

export type UpcomingEvent = { id: string; title: string; type: FamilyEventType; date: Date; memberName: string | null };

export function UpcomingEvents({ events }: { events: UpcomingEvent[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Upcoming Events</CardTitle>
        <Link href="/family/events" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {events.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
        {events.map((e) => (
          <div key={e.id} className="flex items-start gap-2 text-sm">
            <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium">
                {FAMILY_EVENT_TYPE_META[e.type].icon} {e.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {e.date.toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short" })}
                {e.memberName ? ` · ${e.memberName}` : ""}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
