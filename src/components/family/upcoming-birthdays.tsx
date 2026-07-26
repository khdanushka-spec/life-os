import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake } from "lucide-react";

export type UpcomingBirthday = { id: string; name: string; days: number };

export function UpcomingBirthdays({ birthdays }: { birthdays: UpcomingBirthday[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Upcoming Birthdays</CardTitle>
        <Link href="/family/members" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {birthdays.length === 0 && <p className="text-sm text-muted-foreground">Nothing in the next 30 days.</p>}
        {birthdays.map((b) => (
          <div key={b.id} className="flex items-center gap-2 text-sm">
            <Cake className="size-3.5 shrink-0 text-rose-500" />
            <span className="flex-1 truncate">{b.name}</span>
            <span className="text-xs text-muted-foreground">{b.days === 0 ? "Today" : b.days === 1 ? "Tomorrow" : `in ${b.days} days`}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
