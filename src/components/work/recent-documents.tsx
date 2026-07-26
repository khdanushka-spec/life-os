import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ExternalLink } from "lucide-react";

export type RecentDocument = { id: string; title: string; url: string | null };

export function RecentDocuments({ documents }: { documents: RecentDocument[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Recent Documents</CardTitle>
        <Link href="/work/documents" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{d.title}</span>
            </span>
            {d.url && (
              <a href={d.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${d.title}`}>
                <ExternalLink className="size-3.5 text-muted-foreground hover:text-foreground" />
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
