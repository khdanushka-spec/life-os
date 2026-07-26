import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

export type WishlistSummary = { id: string; destination: string; country: string | null; starred: boolean };

export function WishlistQuickList({ destinations }: { destinations: WishlistSummary[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Wishlist</CardTitle>
        <Link href="/travel/wishlist" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {destinations.length === 0 && <p className="text-sm text-muted-foreground">No destinations yet.</p>}
        {destinations.slice(0, 6).map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-sm">
            {d.starred && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />}
            <span className="flex-1 truncate">
              {d.destination}
              {d.country && <span className="text-muted-foreground"> · {d.country}</span>}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
