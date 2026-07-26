import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type ClientSummary = { id: string; name: string; company: string | null; projectCount: number };

export function ClientsQuickList({ clients }: { clients: ClientSummary[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Clients</CardTitle>
        <Link href="/work/clients" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {clients.length === 0 && <p className="text-sm text-muted-foreground">No clients yet.</p>}
        {clients.slice(0, 6).map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">
              {c.name}
              {c.company && <span className="text-muted-foreground"> · {c.company}</span>}
            </span>
            <Badge variant="secondary">{c.projectCount}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
