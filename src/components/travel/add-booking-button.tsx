"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingFormDialog } from "@/components/travel/booking-form-dialog";

export function AddBookingButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 self-start">
        <Plus className="size-3.5" />
        Add Booking
      </Button>
      <BookingFormDialog open={open} onOpenChange={setOpen} mode="create" tripId={tripId} />
    </>
  );
}
