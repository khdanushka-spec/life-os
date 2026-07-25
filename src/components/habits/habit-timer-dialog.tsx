"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toggleHabitTodayAction } from "@/server/actions/habits";

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Only mounted while open, so the stopwatch starts fresh at 0:00 every
// time it's opened, with no reset-on-close effect needed.
function HabitTimerBody({
  onOpenChange,
  habitId,
  habitTitle,
  targetMinutes,
}: {
  onOpenChange: (open: boolean) => void;
  habitId: string;
  habitTitle: string;
  targetMinutes: number | null;
}) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function handleFinish() {
    setRunning(false);
    const minutes = Math.max(1, Math.round(seconds / 60));
    startTransition(async () => {
      await toggleHabitTodayAction(habitId, true, { value: minutes });
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{habitTitle}</DialogTitle>
        <DialogDescription>
          {targetMinutes ? `Target: ${targetMinutes} minutes` : "Timing this session"}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-4 py-6">
        <p className="text-5xl font-semibold tabular-nums tracking-tight">{formatDuration(seconds)}</p>
        <Button
          type="button"
          variant={running ? "outline" : "default"}
          onClick={() => setRunning((r) => !r)}
          className="gap-1.5"
        >
          {running ? <Square className="size-4" /> : <Play className="size-4" />}
          {running ? "Pause" : "Resume"}
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleFinish} disabled={isPending || seconds === 0}>
          {isPending ? "Saving..." : "Finish & mark complete"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function HabitTimerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitId: string;
  habitTitle: string;
  targetMinutes: number | null;
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <HabitTimerBody {...props} />}</DialogContent>
    </Dialog>
  );
}
