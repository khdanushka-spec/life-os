"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { upsertStudyLogAction } from "@/server/actions/learning";
import { STUDY_GOAL_MINUTES } from "@/lib/learning";
import type { StudyLogDetail } from "@/components/learning/types";

export function DailyStudyLogCard({ log }: { log: StudyLogDetail }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [minutesStudied, setMinutesStudied] = useState(log.minutesStudied ?? 0);
  const [focusScore, setFocusScore] = useState(log.focusScore ?? 3);
  const [note, setNote] = useState(log.note ?? "");

  function save(overrides?: { minutesStudied?: number; focusScore?: number }) {
    startTransition(async () => {
      await upsertStudyLogAction({
        date: log.date,
        minutesStudied: overrides?.minutesStudied ?? minutesStudied,
        focusScore: overrides?.focusScore ?? focusScore,
        note: note || null,
      });
      router.refresh();
    });
  }

  function addMinutes(amount: number) {
    const next = Math.max(0, minutesStudied + amount);
    setMinutesStudied(next);
    save({ minutesStudied: next });
  }

  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-base">Today&apos;s Study Log</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Clock className="size-3.5 text-amber-500" /> Studied ({minutesStudied} / {STUDY_GOAL_MINUTES} min)
          </div>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => addMinutes(15)} className="gap-1">
              <Plus className="size-3.5" /> 15m
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addMinutes(30)} className="gap-1">
              <Plus className="size-3.5" /> 30m
            </Button>
            {minutesStudied > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => addMinutes(-minutesStudied)} className="gap-1">
                <RotateCcw className="size-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Focus ({focusScore}/5)</p>
          <Slider
            value={[focusScore]}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v;
              setFocusScore(next);
              save({ focusScore: next });
            }}
            min={1}
            max={5}
            step={1}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="studylog-note" className="text-sm font-medium">
            Note
          </label>
          <Textarea
            id="studylog-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => save()}
            maxLength={1000}
            rows={2}
            placeholder="What did you work on today?"
          />
        </div>
      </CardContent>
    </Card>
  );
}
