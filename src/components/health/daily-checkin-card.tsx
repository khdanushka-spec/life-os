"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Droplet, Plus, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { upsertDailyHealthLogAction } from "@/server/actions/health";
import { WATER_GOAL_ML } from "@/lib/health";
import type { DailyHealthLogDetail } from "@/components/health/types";

export function DailyCheckInCard({ log }: { log: DailyHealthLogDetail }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [weightKg, setWeightKg] = useState(log.weightKg?.toString() ?? "");
  const [waterMl, setWaterMl] = useState(log.waterMl ?? 0);
  const [sleepHours, setSleepHours] = useState(log.sleepHours?.toString() ?? "");
  const [sleepQuality, setSleepQuality] = useState(log.sleepQuality ?? 3);
  const [wellbeingScore, setWellbeingScore] = useState(log.wellbeingScore ?? 5);
  const [note, setNote] = useState(log.note ?? "");

  function save(overrides?: { waterMl?: number; sleepQuality?: number; wellbeingScore?: number }) {
    startTransition(async () => {
      await upsertDailyHealthLogAction({
        date: log.date,
        weightKg: weightKg ? Number(weightKg) : null,
        waterMl: overrides?.waterMl ?? waterMl,
        sleepHours: sleepHours ? Number(sleepHours) : null,
        sleepQuality: overrides?.sleepQuality ?? sleepQuality,
        wellbeingScore: overrides?.wellbeingScore ?? wellbeingScore,
        note: note || null,
      });
      router.refresh();
    });
  }

  function addWater(amount: number) {
    const next = Math.max(0, waterMl + amount);
    setWaterMl(next);
    save({ waterMl: next });
  }

  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-base">Today&apos;s Check-in</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <Droplet className="size-3.5 text-sky-500" /> Water ({waterMl} / {WATER_GOAL_ML} ml)
          </Label>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => addWater(250)} className="gap-1">
              <Plus className="size-3.5" /> 250ml
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addWater(500)} className="gap-1">
              <Plus className="size-3.5" /> 500ml
            </Button>
            {waterMl > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => addWater(-waterMl)} className="gap-1">
                <RotateCcw className="size-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="checkin-weight">Weight (kg)</Label>
            <Input
              id="checkin-weight"
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              onBlur={() => save()}
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="checkin-sleep">Sleep (hours)</Label>
            <Input
              id="checkin-sleep"
              type="number"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              onBlur={() => save()}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Sleep quality ({sleepQuality}/5)</Label>
          <Slider
            value={[sleepQuality]}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v;
              setSleepQuality(next);
              save({ sleepQuality: next });
            }}
            min={1}
            max={5}
            step={1}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Wellbeing ({wellbeingScore}/10)</Label>
          <Slider
            value={[wellbeingScore]}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v;
              setWellbeingScore(next);
              save({ wellbeingScore: next });
            }}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checkin-note">Note</Label>
          <Textarea
            id="checkin-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => save()}
            maxLength={1000}
            rows={2}
            placeholder="How are you feeling today?"
          />
        </div>
      </CardContent>
    </Card>
  );
}
