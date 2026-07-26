import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { WishlistHeader } from "@/components/travel/wishlist-header";
import { WishlistRow } from "@/components/travel/wishlist-row";

export default async function WishlistPage() {
  const dbUser = await requireDbUser();

  const destinations = await prisma.wishlistDestination.findMany({
    where: { userId: dbUser.id },
    orderBy: [{ starred: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/travel" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Travel
      </Link>
      <WishlistHeader />
      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardContent className="flex flex-col gap-2 p-4">
          {destinations.length === 0 && (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No destinations yet — add your first one above.
            </p>
          )}
          {destinations.map((d) => (
            <WishlistRow key={d.id} destination={d} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
