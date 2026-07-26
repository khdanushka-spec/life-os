import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TripCard } from "@/components/travel/trip-card";
import { TRIP_STATUS_META } from "@/lib/travel";
import type { TripSummary } from "@/components/travel/types";
import type { TripStatus } from "@/generated/prisma/client";

const GROUP_ORDER: TripStatus[] = ["ONGOING", "UPCOMING", "PLANNING", "COMPLETED", "CANCELLED"];

export function TripBoard({ trips }: { trips: TripSummary[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-base">Trips</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {trips.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No trips yet — create your first one to get started.
          </p>
        )}
        {GROUP_ORDER.map((status) => {
          const group = trips.filter((t) => t.status === status);
          if (group.length === 0) return null;
          return (
            <div key={status} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {TRIP_STATUS_META[status].label} ({group.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
