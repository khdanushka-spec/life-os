import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";

export type CertificateExpirySummary = { id: string; title: string; expiryDate: Date };

export function UpcomingCertificateExpiries({ certificates }: { certificates: CertificateExpirySummary[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Upcoming Expiries</CardTitle>
        <Link href="/learning/certificates" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {certificates.length === 0 && <p className="text-sm text-muted-foreground">Nothing expiring soon.</p>}
        {certificates.map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-sm">
            <CalendarClock className="size-3.5 shrink-0 text-primary" />
            <span className="flex-1 truncate">{c.title}</span>
            <span className="text-xs text-muted-foreground">
              {c.expiryDate.toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
