import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { TRIP_STATUS_META, formatTripDateRange } from "@/lib/travel";
import { formatCurrency } from "@/lib/finance";
import { TripHeroActions } from "@/components/travel/trip-hero-actions";
import { AddBookingButton } from "@/components/travel/add-booking-button";
import { BookingRow } from "@/components/travel/booking-row";
import { AddPackingItemForm } from "@/components/travel/add-packing-item-form";
import { PackingItemRow } from "@/components/travel/packing-item-row";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbUser = await requireDbUser();

  const trip = await prisma.trip.findFirst({
    where: { id, userId: dbUser.id },
    include: {
      bookings: { orderBy: { startAt: "asc" } },
      packingItems: { orderBy: [{ packed: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!trip) notFound();

  const dateRange = formatTripDateRange(trip.startDate, trip.endDate);
  const packedCount = trip.packingItems.filter((p) => p.packed).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6">
      <Link href="/travel" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Travel
      </Link>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl">
                {trip.destination}
                {trip.country && <span className="text-muted-foreground"> · {trip.country}</span>}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant="outline" className={TRIP_STATUS_META[trip.status].color}>
                  {TRIP_STATUS_META[trip.status].label}
                </Badge>
                {dateRange && <Badge variant="secondary">{dateRange}</Badge>}
                {trip.budget != null && <Badge variant="outline">{formatCurrency(Number(trip.budget))}</Badge>}
              </div>
            </div>
            <TripHeroActions
              trip={{
                id: trip.id,
                destination: trip.destination,
                country: trip.country,
                startDate: trip.startDate,
                endDate: trip.endDate,
                status: trip.status,
                budget: trip.budget ? Number(trip.budget) : null,
                notes: trip.notes,
              }}
            />
          </div>
        </CardHeader>
        {trip.notes && (
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trip.notes}</p>
          </CardContent>
        )}
      </Card>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Bookings</CardTitle>
          <AddBookingButton tripId={trip.id} />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {trip.bookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
          {trip.bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={{
                id: b.id,
                tripId: b.tripId,
                type: b.type,
                title: b.title,
                provider: b.provider,
                confirmationNumber: b.confirmationNumber,
                startAt: b.startAt,
                endAt: b.endAt,
                cost: b.cost ? Number(b.cost) : null,
                notes: b.notes,
              }}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            Packing List {trip.packingItems.length > 0 && `(${packedCount}/${trip.packingItems.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <AddPackingItemForm tripId={trip.id} />
          {trip.packingItems.length === 0 && <p className="text-sm text-muted-foreground">No packing items yet.</p>}
          {trip.packingItems.map((item) => (
            <PackingItemRow key={item.id} item={{ id: item.id, tripId: item.tripId, name: item.name, category: item.category, packed: item.packed }} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
