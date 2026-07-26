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
import { createBookingAction, updateBookingAction } from "@/server/actions/travel";
import { BOOKING_TYPE_META } from "@/lib/travel";
import type { BookingType } from "@/generated/prisma/client";
import type { BookingDetail } from "@/components/travel/types";

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function BookingFormBody({
  onOpenChange,
  mode,
  tripId,
  booking,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  tripId: string;
  booking?: BookingDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<BookingType>(booking?.type ?? "FLIGHT");
  const [title, setTitle] = useState(booking?.title ?? "");
  const [provider, setProvider] = useState(booking?.provider ?? "");
  const [confirmationNumber, setConfirmationNumber] = useState(booking?.confirmationNumber ?? "");
  const [startAt, setStartAt] = useState(booking?.startAt ? toLocalDatetimeValue(booking.startAt) : "");
  const [endAt, setEndAt] = useState(booking?.endAt ? toLocalDatetimeValue(booking.endAt) : "");
  const [cost, setCost] = useState(booking?.cost?.toString() ?? "");
  const [notes, setNotes] = useState(booking?.notes ?? "");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const payload = {
      type,
      title: title.trim(),
      provider: provider.trim() || null,
      confirmationNumber: confirmationNumber.trim() || null,
      startAt: startAt ? new Date(startAt).toISOString() : null,
      endAt: endAt ? new Date(endAt).toISOString() : null,
      cost: cost ? Number(cost) : null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const result =
        mode === "edit" && booking
          ? await updateBookingAction(booking.id, tripId, payload)
          : await createBookingAction({ tripId, ...payload });
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
        <DialogTitle>{mode === "edit" ? "Edit booking" : "Add booking"}</DialogTitle>
        <DialogDescription>Flights, hotels, cars, and activities.</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-1">
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as BookingType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BOOKING_TYPE_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.icon} {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="booking-cost">Cost</Label>
            <Input id="booking-cost" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="booking-title">Title</Label>
          <Input id="booking-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus placeholder="Qantas QF1, Hilton Downtown…" />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="booking-provider">Provider</Label>
            <Input id="booking-provider" value={provider} onChange={(e) => setProvider(e.target.value)} maxLength={120} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="booking-confirmation">Confirmation #</Label>
            <Input id="booking-confirmation" value={confirmationNumber} onChange={(e) => setConfirmationNumber(e.target.value)} maxLength={80} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="booking-start">Start</Label>
            <Input id="booking-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="booking-end">End</Label>
            <Input id="booking-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="booking-notes">Notes</Label>
          <Textarea id="booking-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Add booking"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function BookingFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  tripId: string;
  booking?: BookingDetail;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <BookingFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
