"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

export function FocusTimer() {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          const nextMode = mode === "focus" ? "break" : "focus";
          setMode(nextMode);
          return (nextMode === "focus" ? FOCUS_MINUTES : BREAK_MINUTES) * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode]);

  function reset() {
    setRunning(false);
    setMode("focus");
    setSecondsLeft(FOCUS_MINUTES * 60);
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Timer className="size-4 text-primary" /> Focus Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <p className="text-xs text-muted-foreground capitalize">{mode}</p>
        <p className="text-3xl font-semibold tabular-nums">
          {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        </p>
        <div className="flex gap-2">
          <Button size="icon-sm" variant="outline" onClick={() => setRunning((r) => !r)} aria-label={running ? "Pause" : "Start"}>
            {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={reset} aria-label="Reset">
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
