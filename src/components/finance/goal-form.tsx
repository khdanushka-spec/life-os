"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createGoalAction } from "@/server/actions/finance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function GoalForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" /> Add goal
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add savings goal</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            startTransition(async () => {
              await createGoalAction(formData);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-name">Name</Label>
            <Input id="goal-name" name="name" placeholder="e.g. Emergency Fund" required maxLength={80} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-target">Target amount</Label>
              <Input id="goal-target" name="targetAmount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-current">Starting amount</Label>
              <Input id="goal-current" name="currentAmount" type="number" step="0.01" min="0" placeholder="0.00" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-date">Target date (optional)</Label>
            <Input id="goal-date" name="targetDate" type="date" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="isEmergencyFund" value="on" />
            This is my emergency fund
          </label>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
