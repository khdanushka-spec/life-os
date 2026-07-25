"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  MoreVertical,
  MessageSquarePlus,
  Timer as TimerIcon,
  Pencil,
  Trash2,
  Copy,
  History,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleHabitTodayAction, deleteHabitAction, duplicateHabitAction } from "@/server/actions/habits";
import { QuickNoteDialog } from "@/components/habits/quick-note-dialog";
import { HabitTimerDialog } from "@/components/habits/habit-timer-dialog";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import type { HabitCategoryOption, HabitWithStats } from "@/components/habits/types";
import { cn } from "@/lib/utils";

const RING_SIZE = 34;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function progressFor(habit: HabitWithStats): number {
  if (habit.goalType === "MULTIPLE" && habit.targetCount) {
    const value = habit.todayValue ?? (habit.doneToday ? habit.targetCount : 0);
    return Math.min(100, (value / habit.targetCount) * 100);
  }
  if (habit.goalType === "DURATION" && habit.estimatedMinutes) {
    const value = habit.todayValue ?? (habit.doneToday ? habit.estimatedMinutes : 0);
    return Math.min(100, (value / habit.estimatedMinutes) * 100);
  }
  return habit.doneToday ? 100 : 0;
}

function ProgressRing({ percent, color }: { percent: number; color: string }) {
  const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
  return (
    <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90 shrink-0">
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        strokeWidth={RING_STROKE}
        className="stroke-muted"
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        stroke={color}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 9 });
  const emojis = ["✨", "🎉", "⭐"];
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      {pieces.map((_, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        const distance = 22 + (i % 3) * 8;
        return (
          <motion.span
            key={i}
            className="absolute left-6 top-1/2 text-sm"
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
            animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, opacity: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {emojis[i % emojis.length]}
          </motion.span>
        );
      })}
    </div>
  );
}

export function HabitRow({ habit, categories }: { habit: HabitWithStats; categories: HabitCategoryOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  function handleToggle(checked: boolean) {
    if (checked) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 700);
    }
    startTransition(async () => {
      await toggleHabitTodayAction(habit.id, checked);
      router.refresh();
    });
  }

  const percent = progressFor(habit);
  const usesTimer = habit.goalType === "DURATION";

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border p-3 transition-all hover:border-foreground/20 hover:bg-muted/40",
        isPending && "opacity-60",
      )}
    >
      <AnimatePresence>{celebrate && <ConfettiBurst />}</AnimatePresence>

      <Checkbox
        checked={habit.doneToday}
        onCheckedChange={(checked) => handleToggle(Boolean(checked))}
        className="shrink-0"
      />

      <span className="shrink-0 text-xl" style={{ filter: habit.doneToday ? "none" : "grayscale(0.3)" }}>
        {habit.icon}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/habits/${habit.id}`} className="flex items-center gap-1.5 hover:underline">
          <span className={cn("truncate text-sm font-medium", habit.doneToday && "text-muted-foreground line-through")}>
            {habit.title}
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          {habit.category && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${habit.category.color}20`, color: habit.category.color }}
            >
              {habit.category.name}
            </span>
          )}
          {habit.goalType !== "ONCE" && (
            <span className="text-xs text-muted-foreground">
              {habit.todayValue ?? 0}/{habit.goalType === "MULTIPLE" ? habit.targetCount : habit.estimatedMinutes}{" "}
              {habit.goalType === "MULTIPLE" ? habit.targetUnit : "min"}
            </span>
          )}
        </div>
      </div>

      {habit.streak > 0 && (
        <Badge variant="secondary" className="shrink-0 gap-1">
          <Flame className="size-3 text-orange-500" />
          {habit.streak}
        </Badge>
      )}

      <ProgressRing percent={percent} color={habit.color} />

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Button variant="ghost" size="icon-sm" aria-label="Add note" onClick={() => setNoteOpen(true)}>
          <MessageSquarePlus className="size-3.5" />
        </Button>
        {usesTimer && (
          <Button variant="ghost" size="icon-sm" aria-label="Start timer" onClick={() => setTimerOpen(true)}>
            <TimerIcon className="size-3.5" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
            <MoreVertical className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                startTransition(async () => {
                  await duplicateHabitAction(habit.id);
                  router.refresh();
                })
              }
            >
              <Copy /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/habits/${habit.id}`} />}>
              <History /> History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                startTransition(async () => {
                  await deleteHabitAction(habit.id);
                  router.refresh();
                })
              }
            >
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <QuickNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        habitId={habit.id}
        habitTitle={habit.title}
        currentNote={habit.todayNote}
      />
      {usesTimer && (
        <HabitTimerDialog
          open={timerOpen}
          onOpenChange={setTimerOpen}
          habitId={habit.id}
          habitTitle={habit.title}
          targetMinutes={habit.estimatedMinutes}
        />
      )}
      <HabitFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" habit={habit} categories={categories} />
    </div>
  );
}
