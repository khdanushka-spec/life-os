"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripFormDialog } from "@/components/travel/trip-form-dialog";

export function TravelHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Travel</h1>
        <p className="text-sm text-muted-foreground">Trips, bookings, and packing — all in one place.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        New Trip
      </Button>
      <TripFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
