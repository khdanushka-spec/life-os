import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GIFT_IDEA_STATUS_META } from "@/lib/family";
import type { GiftIdeaStatus } from "@/generated/prisma/client";

export type GiftIdeaSummary = { id: string; title: string; memberName: string; status: GiftIdeaStatus };

export function GiftIdeasQuickList({ giftIdeas }: { giftIdeas: GiftIdeaSummary[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Gift Ideas</CardTitle>
        <Link href="/family/gifts" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {giftIdeas.length === 0 && <p className="text-sm text-muted-foreground">No gift ideas yet.</p>}
        {giftIdeas.slice(0, 6).map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">
              {g.title} <span className="text-muted-foreground">· {g.memberName}</span>
            </span>
            <Badge variant="secondary">
              {GIFT_IDEA_STATUS_META[g.status].icon} {GIFT_IDEA_STATUS_META[g.status].label}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
