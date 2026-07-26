"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTripAction, updateTripAction } from "@/server/actions/travel";
import { TRIP_STATUS_META } from "@/lib/travel";
import type { TripStatus } from "@/generated/prisma/client";
import type { TripDetail } from "@/components/travel/types";

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function TripFormBody({
  onOpenChange,
  mode,
  trip,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  trip?: TripDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState(trip?.destination ?? "");
  const [country, setCountry] = useState(trip?.country ?? "");
  const [status, setStatus] = useState<TripStatus>(trip?.status ?? "PLANNING");
  const [startDate, setStartDate] = useState(trip?.startDate ? toLocalDateValue(trip.startDate) : "");
  const [endDate, setEndDate] = useState(trip?.endDate ? toLocalDateValue(trip.endDate) : "");
  const [budget, setBudget] = useState(trip?.budget?.toString() ?? "");
  const [notes, setNotes] = useState(trip?.notes ?? "");

  function handleSubmit() {
    if (!destination.trim()) {
      setError("Destination is required.");
      return;
    }
    const payload = {
      destination: destination.trim(),
      country: country.trim() || null,
      status,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: budget ? Number(budget) : null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result = mode === "edit" && trip ? await updateTripAction(trip.id, payload) : await createTripAction(payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit trip" : "New trip"}</DialogTitle>
        <DialogDescription>Where you&apos;re going, and when.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="trip-destination">Destination</Label>
            <Input id="trip-destination" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={120} autoFocus />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="trip-country">Country</Label>
            <Input id="trip-country" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="trip-start">Start date</Label>
            <Input id="trip-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="trip-end">End date</Label>
            <Input id="trip-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TripStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TRIP_STATUS_META) as TripStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {TRIP_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="trip-budget">Budget</Label>
            <Input id="trip-budget" type="number" min={0} step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trip-notes">Notes</Label>
          <Textarea
            id="trip-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={4000}
            rows={3}
            placeholder="Plans, highlights, memories…"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create trip"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function TripFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  trip?: TripDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <TripFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
