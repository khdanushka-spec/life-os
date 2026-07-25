"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createRecurringAction } from "@/server/actions/finance";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TRANSACTION_CATEGORIES } from "@/lib/finance";
import type { RecurringInterval, TransactionType } from "@/generated/prisma/client";

const INTERVALS: { value: RecurringInterval; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "FORTNIGHTLY", label: "Fortnightly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

export function RecurringForm() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [interval, setInterval] = useState<RecurringInterval>("MONTHLY");
  const [category, setCategory] = useState(TRANSACTION_CATEGORIES[0]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" /> Add recurring
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add bill or subscription</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            formData.set("type", type);
            formData.set("interval", interval);
            formData.set("category", category);
            startTransition(async () => {
              await createRecurringAction(formData);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rec-name">Name</Label>
            <Input id="rec-name" name="name" placeholder="e.g. Netflix" required maxLength={80} />
          </div>
          <div className="flex gap-2">
            {(["EXPENSE", "INCOME"] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                  type === t ? "border-primary bg-primary/10" : "border-transparent bg-muted text-muted-foreground"
                }`}
              >
                {t.toLowerCase()}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rec-amount">Amount</Label>
              <Input id="rec-amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rec-date">Next due</Label>
              <Input id="rec-date" name="nextDueDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Repeats</Label>
            <Select value={interval} onValueChange={(v) => setInterval(v as RecurringInterval)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as string)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="autoPay" value="on" />
            Auto-pay
          </label>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
