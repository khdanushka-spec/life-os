"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { generateTravelReport } from "@/lib/ai/travel";
import { TripStatus, BookingType, type ReportPeriod } from "@/generated/prisma/client";

function revalidateTravel(subpath?: string) {
  revalidatePath("/travel");
  revalidatePath("/travel/wishlist");
  if (subpath) revalidatePath(subpath);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

// ---------- Trips ----------

const tripSchema = z.object({
  destination: z.string().trim().min(1, "Destination is required.").max(120),
  country: optionalText(80),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.nativeEnum(TripStatus),
  budget: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  notes: optionalText(4000),
});

export async function createTripAction(input: z.input<typeof tripSchema>) {
  const dbUser = await requireDbUser();
  const parsed = tripSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startDate, endDate, ...rest } = parsed.data;
  const trip = await prisma.trip.create({
    data: { userId: dbUser.id, ...rest, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null },
  });
  revalidateTravel();
  return { trip };
}

const tripUpdateSchema = tripSchema.partial();

export async function updateTripAction(tripId: string, input: z.input<typeof tripUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = tripUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startDate, endDate, ...rest } = parsed.data;
  await prisma.trip.updateMany({
    where: { id: tripId, userId: dbUser.id },
    data: {
      ...rest,
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
    },
  });
  revalidateTravel(`/travel/${tripId}`);
  return { success: true };
}

export async function deleteTripAction(tripId: string) {
  const dbUser = await requireDbUser();
  // Bookings/packing items cascade-delete with the trip - they make no
  // sense without it, unlike Work's documents which keep existing.
  await prisma.trip.deleteMany({ where: { id: tripId, userId: dbUser.id } });
  revalidateTravel();
}

// ---------- Bookings ----------

const bookingSchema = z.object({
  tripId: z.string().uuid(),
  type: z.nativeEnum(BookingType),
  title: z.string().trim().min(1, "Title is required.").max(200),
  provider: optionalText(120),
  confirmationNumber: optionalText(80),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  cost: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  notes: optionalText(1000),
});

export async function createBookingAction(input: z.input<typeof bookingSchema>) {
  const dbUser = await requireDbUser();
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startAt, endAt, ...rest } = parsed.data;
  const booking = await prisma.booking.create({
    data: { userId: dbUser.id, ...rest, startAt: startAt ? new Date(startAt) : null, endAt: endAt ? new Date(endAt) : null },
  });
  revalidateTravel(`/travel/${parsed.data.tripId}`);
  return { booking };
}

const bookingUpdateSchema = bookingSchema.omit({ tripId: true }).partial();

export async function updateBookingAction(bookingId: string, tripId: string, input: z.input<typeof bookingUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = bookingUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { startAt, endAt, ...rest } = parsed.data;
  await prisma.booking.updateMany({
    where: { id: bookingId, userId: dbUser.id },
    data: {
      ...rest,
      ...(startAt !== undefined ? { startAt: startAt ? new Date(startAt) : null } : {}),
      ...(endAt !== undefined ? { endAt: endAt ? new Date(endAt) : null } : {}),
    },
  });
  revalidateTravel(`/travel/${tripId}`);
  return { success: true };
}

export async function deleteBookingAction(bookingId: string, tripId: string) {
  const dbUser = await requireDbUser();
  await prisma.booking.deleteMany({ where: { id: bookingId, userId: dbUser.id } });
  revalidateTravel(`/travel/${tripId}`);
}

// ---------- Packing items ----------

const packingItemSchema = z.object({
  tripId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required.").max(120),
  category: optionalText(40),
});

export async function createPackingItemAction(input: z.input<typeof packingItemSchema>) {
  const dbUser = await requireDbUser();
  const parsed = packingItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const item = await prisma.packingItem.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateTravel(`/travel/${parsed.data.tripId}`);
  return { item };
}

export async function togglePackingItemAction(itemId: string, tripId: string, packed: boolean) {
  const dbUser = await requireDbUser();
  await prisma.packingItem.updateMany({ where: { id: itemId, userId: dbUser.id }, data: { packed } });
  revalidateTravel(`/travel/${tripId}`);
}

export async function deletePackingItemAction(itemId: string, tripId: string) {
  const dbUser = await requireDbUser();
  await prisma.packingItem.deleteMany({ where: { id: itemId, userId: dbUser.id } });
  revalidateTravel(`/travel/${tripId}`);
}

// ---------- Wishlist ----------

const wishlistSchema = z.object({
  destination: z.string().trim().min(1, "Destination is required.").max(120),
  country: optionalText(80),
  notes: optionalText(1000),
  starred: z.boolean().default(false),
});

export async function createWishlistDestinationAction(input: z.input<typeof wishlistSchema>) {
  const dbUser = await requireDbUser();
  const parsed = wishlistSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const destination = await prisma.wishlistDestination.create({ data: { userId: dbUser.id, ...parsed.data } });
  revalidateTravel();
  return { destination };
}

const wishlistUpdateSchema = wishlistSchema.partial();

export async function updateWishlistDestinationAction(destinationId: string, input: z.input<typeof wishlistUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = wishlistUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.wishlistDestination.updateMany({ where: { id: destinationId, userId: dbUser.id }, data: parsed.data });
  revalidateTravel();
  return { success: true };
}

export async function deleteWishlistDestinationAction(destinationId: string) {
  const dbUser = await requireDbUser();
  await prisma.wishlistDestination.deleteMany({ where: { id: destinationId, userId: dbUser.id } });
  revalidateTravel();
}

export async function convertWishlistToTripAction(destinationId: string) {
  const dbUser = await requireDbUser();
  const destination = await prisma.wishlistDestination.findFirst({ where: { id: destinationId, userId: dbUser.id } });
  if (!destination) return { error: "Destination not found." };
  const trip = await prisma.trip.create({
    data: { userId: dbUser.id, destination: destination.destination, country: destination.country, status: "PLANNING" },
  });
  await prisma.wishlistDestination.deleteMany({ where: { id: destinationId, userId: dbUser.id } });
  revalidateTravel();
  return { trip };
}

// ---------- Reports ----------

export async function generateTravelReportAction(period: ReportPeriod, periodStart: string) {
  const dbUser = await requireDbUser();
  const summary = await generateTravelReport(dbUser.id, period, new Date(periodStart));
  revalidateTravel("/travel/reports");
  return summary;
}
