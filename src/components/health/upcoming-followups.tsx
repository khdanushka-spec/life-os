import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";

export type FollowUpSummary = { id: string; title: string; followUpDate: Date };

export function UpcomingFollowUps({ followUps }: { followUps: FollowUpSummary[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Upcoming Follow-ups</CardTitle>
        <Link href="/health/medical" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {followUps.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
        {followUps.map((f) => (
          <div key={f.id} className="flex items-center gap-2 text-sm">
            <CalendarClock className="size-3.5 shrink-0 text-primary" />
            <span className="flex-1 truncate">{f.title}</span>
            <span className="text-xs text-muted-foreground">
              {f.followUpDate.toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
