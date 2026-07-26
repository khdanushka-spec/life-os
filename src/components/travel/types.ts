import type { TripStatus, BookingType } from "@/generated/prisma/client";

export type TripSummary = {
  id: string;
  destination: string;
  country: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: TripStatus;
  budget: number | null;
  notes: string | null;
  bookingCount: number;
  packedCount: number;
  packingCount: number;
};

export type TripDetail = {
  id: string;
  destination: string;
  country: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: TripStatus;
  budget: number | null;
  notes: string | null;
};

export type BookingDetail = {
  id: string;
  tripId: string;
  type: BookingType;
  title: string;
  provider: string | null;
  confirmationNumber: string | null;
  startAt: Date | null;
  endAt: Date | null;
  cost: number | null;
  notes: string | null;
};

export type PackingItemDetail = {
  id: string;
  tripId: string;
  name: string;
  category: string | null;
  packed: boolean;
};

export type WishlistDetail = {
  id: string;
  destination: string;
  country: string | null;
  notes: string | null;
  starred: boolean;
};
