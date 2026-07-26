import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MemberSummary = { id: string; name: string; relationship: string | null };

export function MembersQuickList({ members }: { members: MemberSummary[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Family Members</CardTitle>
        <Link href="/family/members" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {members.length === 0 && <p className="text-sm text-muted-foreground">No family members yet.</p>}
        {members.slice(0, 6).map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{m.name}</span>
            {m.relationship && <span className="text-xs text-muted-foreground">{m.relationship}</span>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
